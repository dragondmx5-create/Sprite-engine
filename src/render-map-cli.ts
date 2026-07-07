#!/usr/bin/env node
// =============================================================================
// render-map-cli.ts — CLI wrapper for world map / territory card rendering.
//
// Usage:
//   echo '<json>' | npx tsx src/render-map-cli.ts --mode=map    > output.png
//   echo '<json>' | npx tsx src/render-map-cli.ts --mode=card   > output.png
//   npx tsx src/render-map-cli.ts --mode=map --input=data.json  > output.png
//
// Input JSON for --mode=map:
//   { "territories": [...], "title": "..." }
//
// Input JSON for --mode=card:
//   { "territory": {...}, "upgrades": {...}, "monsterCount": N, "treasury": N }
//
// Output: raw PNG to stdout.
// =============================================================================

import { generateWorldMap, generateTerritoryCard } from './worldmap';
import type { SpriteBuffer } from './types';
import * as fs from 'fs';
import * as zlib from 'zlib';

function encodePNG(buf: SpriteBuffer): Buffer {
  const { width, height, data } = buf;

  const rawRows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const filterByte = Buffer.from([0]);
    const rowData = Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4);
    rawRows.push(Buffer.concat([filterByte, rowData]));
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const chunks: Buffer[] = [];

  // PNG signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  function writeChunk(type: string, chunkData: Buffer) {
    const typeBytes = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(chunkData.length, 0);
    const crcInput = Buffer.concat([typeBytes, chunkData]);

    let crc = 0xFFFFFFFF;
    for (let i = 0; i < crcInput.length; i++) {
      crc ^= crcInput[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
      }
    }
    crc ^= 0xFFFFFFFF;
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);

    chunks.push(lenBuf, typeBytes, chunkData, crcBuf);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  writeChunk('IHDR', ihdr);

  // IDAT
  writeChunk('IDAT', compressed);

  // IEND
  writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat(chunks);
}

async function main() {
  const args = process.argv.slice(2);
  let mode = 'map';
  let inputFile = '';

  for (const arg of args) {
    if (arg.startsWith('--mode=')) mode = arg.slice(7);
    else if (arg.startsWith('--input=')) inputFile = arg.slice(8);
  }

  let jsonStr: string;
  if (inputFile) {
    jsonStr = fs.readFileSync(inputFile, 'utf-8');
  } else {
    jsonStr = fs.readFileSync(0, 'utf-8');
  }

  const input = JSON.parse(jsonStr);
  let result: SpriteBuffer;

  if (mode === 'card') {
    result = generateTerritoryCard(
      input.territory,
      input.upgrades,
      input.monsterCount,
      input.treasury,
    );
  } else {
    result = generateWorldMap(input);
  }

  const png = encodePNG(result);
  process.stdout.write(png);
}

main().catch(err => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
