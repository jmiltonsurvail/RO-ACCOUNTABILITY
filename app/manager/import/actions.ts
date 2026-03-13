"use server";

import {
  ActivityType,
  ImportStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { parseXtimeCsv } from "@/lib/import";
import { prisma } from "@/lib/prisma";

export type ImportActionState = {
  batchId?: string;
  error?: string;
  success?: string;
};

export async function importXtimeCsvAction(
  previousState: ImportActionState = {},
  formData: FormData,
): Promise<ImportActionState> {
  void previousState;
  const session = await requireRole([Role.MANAGER]);
  const csvFile = formData.get("csvFile");

  if (!(csvFile instanceof File) || !csvFile.name.toLowerCase().endsWith(".csv")) {
    return { error: "Upload the daily Xtime export as a .csv file." };
  }

  const csvText = await csvFile.text();
  let parsedFile;

  try {
    parsedFile = parseXtimeCsv(csvText, new Date());
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to parse the uploaded CSV.",
    };
  }

  const batch = await prisma.importBatch.create({
    data: {
      sourceFileName: csvFile.name,
      sourceRowCount: parsedFile.sourceRowCount,
      status: ImportStatus.PENDING,
      uploadedById: session.user.id,
    },
  });

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.activityLog.create({
        data: {
          importBatchId: batch.id,
          message: `Import started for ${csvFile.name}.`,
          metadata: {
            sourceRowCount: parsedFile.sourceRowCount,
          } satisfies Prisma.InputJsonValue,
          type: ActivityType.IMPORT_BATCH_CREATED,
          userId: session.user.id,
        },
      });

      if (parsedFile.errors.length > 0) {
        await transaction.importRowError.createMany({
          data: parsedFile.errors.map((rowError) => ({
            importBatchId: batch.id,
            rawRowJson: rowError.rawRowJson,
            reason: rowError.reason,
            roNumber: rowError.roNumber,
            rowNumber: rowError.rowNumber,
          })),
        });
      }

      const importedRoNumbers: number[] = [];

      for (const row of parsedFile.rows) {
        const repairOrder = await transaction.repairOrder.upsert({
          where: { roNumber: row.roNumber },
          update: {
            asmNumber: row.asmNumber,
            customerName: row.customerName,
            flags: row.flags,
            isActive: true,
            lastImportBatchId: batch.id,
            mode: row.mode,
            model: row.model,
            mtDisplayRaw: row.mtDisplayRaw,
            mtRaw: row.mtRaw,
            phone: row.phone,
            promisedAtNormalized: row.promisedAtNormalized,
            promisedRaw: row.promisedRaw,
            rawSourceData: row.rawSourceData,
            tag: row.tag,
            techNumber: row.techNumber,
            ttDisplayRaw: row.ttDisplayRaw,
            ttRaw: row.ttRaw,
            year: row.year,
          },
          create: {
            asmNumber: row.asmNumber,
            customerName: row.customerName,
            flags: row.flags,
            isActive: true,
            lastImportBatchId: batch.id,
            mode: row.mode,
            model: row.model,
            mtDisplayRaw: row.mtDisplayRaw,
            mtRaw: row.mtRaw,
            phone: row.phone,
            promisedAtNormalized: row.promisedAtNormalized,
            promisedRaw: row.promisedRaw,
            rawSourceData: row.rawSourceData,
            roNumber: row.roNumber,
            tag: row.tag,
            techNumber: row.techNumber,
            ttDisplayRaw: row.ttDisplayRaw,
            ttRaw: row.ttRaw,
            year: row.year,
          },
        });

        importedRoNumbers.push(row.roNumber);

        await transaction.activityLog.create({
          data: {
            importBatchId: batch.id,
            message: `Imported RO ${row.roNumber}.`,
            metadata: {
              asmNumber: row.asmNumber,
              mode: row.mode,
              promisedRaw: row.promisedRaw,
            } satisfies Prisma.InputJsonValue,
            repairOrderId: repairOrder.id,
            type: ActivityType.IMPORT_ROW_SYNCED,
            userId: session.user.id,
          },
        });
      }

      const staleRepairOrders = await transaction.repairOrder.findMany({
        where: {
          isActive: true,
          roNumber: {
            notIn: importedRoNumbers.length > 0 ? importedRoNumbers : [-1],
          },
        },
        include: {
          blockerState: true,
        },
      });

      if (staleRepairOrders.length > 0) {
        await transaction.repairOrder.updateMany({
          where: {
            id: {
              in: staleRepairOrders.map((repairOrder) => repairOrder.id),
            },
          },
          data: {
            isActive: false,
          },
        });
      }

      for (const staleRepairOrder of staleRepairOrders) {
        if (staleRepairOrder.blockerState?.isBlocked) {
          await transaction.blockerState.update({
            where: { repairOrderId: staleRepairOrder.id },
            data: { isBlocked: false },
          });

          await transaction.activityLog.create({
            data: {
              importBatchId: batch.id,
              message: "RO removed from the latest daily import; blocker auto-cleared.",
              repairOrderId: staleRepairOrder.id,
              type: ActivityType.BLOCKER_CLEARED,
              userId: session.user.id,
            },
          });
        }

        await transaction.activityLog.create({
          data: {
            importBatchId: batch.id,
            message: `RO ${staleRepairOrder.roNumber} marked inactive after import.`,
            repairOrderId: staleRepairOrder.id,
            type: ActivityType.RO_INACTIVATED,
            userId: session.user.id,
          },
        });
      }

      await transaction.importBatch.update({
        where: { id: batch.id },
        data: {
          completedAt: new Date(),
          importedRowCount: parsedFile.rows.length,
          skippedRowCount: parsedFile.errors.length,
          status: ImportStatus.SUCCESS,
        },
      });
    });
  } catch (error) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        completedAt: new Date(),
        importedRowCount: 0,
        skippedRowCount: parsedFile.errors.length,
        status: ImportStatus.FAILED,
      },
    });

    return {
      batchId: batch.id,
      error: error instanceof Error ? error.message : "Import failed.",
    };
  }

  revalidatePath("/manager");
  revalidatePath("/manager/import");
  revalidatePath("/dispatcher");
  revalidatePath("/advisor");

  return {
    batchId: batch.id,
    success: `Imported ${parsedFile.rows.length} rows and skipped ${parsedFile.errors.length}.`,
  };
}
