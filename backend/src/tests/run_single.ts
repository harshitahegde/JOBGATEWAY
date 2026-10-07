import { calculateDeterministicATSScore } from '../ats_engine';
import fs from 'fs';

const inputPath = process.argv[2];
if (!inputPath || !fs.existsSync(inputPath)) {
  console.error("Input file missing");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const res = calculateDeterministicATSScore(data.resume, data.jd);
console.log(JSON.stringify(res));
