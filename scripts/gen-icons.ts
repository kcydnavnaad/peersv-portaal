import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ICONS_DIR = join(process.cwd(), "public", "icons");
const SOURCE = join(ICONS_DIR, "source-logo.png");

if (!existsSync(SOURCE)) {
  console.error(`Missing source file: ${SOURCE}`);
  process.exit(1);
}

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function makeIcon({
  size,
  logoRatio,
  outName,
}: {
  size: number;
  logoRatio: number;
  outName: string;
}) {
  const logoSize = Math.round(size * logoRatio);
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: "contain", background: WHITE })
    .png()
    .toBuffer();

  const offset = Math.round((size - logoSize) / 2);
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: WHITE,
    },
  });

  await canvas
    .composite([{ input: logo, top: offset, left: offset }])
    .png()
    .toFile(join(ICONS_DIR, outName));

  console.log("wrote", outName);
}

async function main() {
  await makeIcon({ size: 192, logoRatio: 0.8, outName: "icon-192.png" });
  await makeIcon({ size: 512, logoRatio: 0.8, outName: "icon-512.png" });
  await makeIcon({
    size: 512,
    logoRatio: 0.6,
    outName: "icon-512-maskable.png",
  });
  await makeIcon({ size: 180, logoRatio: 0.8, outName: "apple-touch-icon.png" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
