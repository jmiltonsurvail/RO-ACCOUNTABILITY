const [major, minor] = process.versions.node.split(".").map(Number);

const supported =
  Number.isInteger(major) &&
  Number.isInteger(minor) &&
  (major > 20 || (major === 20 && minor >= 9));

if (!supported) {
  console.error(
    [
      "Unsupported Node.js version.",
      `Detected: ${process.versions.node}`,
      "Required: >= 20.9.0",
      "This app uses Next.js 16 and will not install or build reliably on Node 18.",
    ].join("\n"),
  );
  process.exit(1);
}
