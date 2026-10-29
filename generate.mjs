// Azure VM retail prices: refreshes data/azure-vm-prices.json from Microsoft's public Azure Retail Prices API,
// then writes data/azure-vm-prices.csv and README.md from it.
//
//   node generate.mjs             rebuild the CSV and README from the existing JSON
//   node generate.mjs --refresh   fetch fresh prices from the API first (about 150 requests, 1-2 minutes)
//
// Source: https://prices.azure.com/api/retail/prices (public, no authentication).
// vCPU and memory come from the Microsoft Learn size-series page cited in `docs` for each SKU.
// Requires Node.js 18 or later (global fetch). No dependencies.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JSON_FILE = path.join(HERE, 'data', 'azure-vm-prices.json');
const CSV_FILE = path.join(HERE, 'data', 'azure-vm-prices.csv');
const SITE = 'https://www.epifive.com';
const API = 'https://prices.azure.com/api/retail/prices';
const DOCS = 'https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/';

// ---------- What to fetch ----------

const REGIONS = [
  { id: 'centralindia', name: 'Central India (Pune)' },
  { id: 'southindia', name: 'South India (Chennai)' },
  { id: 'westindia', name: 'West India (Mumbai)' },
  { id: 'eastus', name: 'East US (Virginia)' },
  { id: 'westeurope', name: 'West Europe (Netherlands)' },
  { id: 'southeastasia', name: 'Southeast Asia (Singapore)' },
];
const CURRENCIES = ['INR', 'USD'];

// [series, family, docs path, [[size, vCPU, memory GiB, gpu?], ...]]
const SERIES = [
  ['Bv1', 'Burstable', 'general-purpose/bv1-series', [['B1ls', 1, 0.5], ['B1s', 1, 1], ['B1ms', 1, 2], ['B2s', 2, 4], ['B2ms', 2, 8], ['B4ms', 4, 16], ['B8ms', 8, 32]]],
  ['Basv2', 'Burstable', 'general-purpose/basv2-series', [['B2ats_v2', 2, 1], ['B2als_v2', 2, 4], ['B2as_v2', 2, 8], ['B4als_v2', 4, 8], ['B4as_v2', 4, 16]]],
  ['Av2', 'Entry level', 'general-purpose/av2-series', [['A2_v2', 2, 4], ['A4_v2', 4, 8]]],
  ['Dsv3', 'General purpose', 'general-purpose/dsv3-series', [['D2s_v3', 2, 8], ['D4s_v3', 4, 16]]],
  ['Dsv5', 'General purpose', 'general-purpose/dsv5-series', [['D2s_v5', 2, 8], ['D4s_v5', 4, 16], ['D8s_v5', 8, 32], ['D16s_v5', 16, 64]]],
  ['Dasv5', 'General purpose', 'general-purpose/dasv5-series', [['D2as_v5', 2, 8], ['D4as_v5', 4, 16], ['D8as_v5', 8, 32]]],
  ['Ddsv5', 'General purpose', 'general-purpose/ddsv5-series', [['D2ds_v5', 2, 8], ['D4ds_v5', 4, 16]]],
  ['Dlsv5', 'General purpose', 'general-purpose/dlsv5-series', [['D2ls_v5', 2, 4], ['D4ls_v5', 4, 8]]],
  ['Dsv6', 'General purpose', 'general-purpose/dsv6-series', [['D2s_v6', 2, 8], ['D4s_v6', 4, 16]]],
  ['Dasv6', 'General purpose', 'general-purpose/dasv6-series', [['D2as_v6', 2, 8], ['D4as_v6', 4, 16]]],
  ['Esv3', 'Memory optimized', 'memory-optimized/ev3-esv3-series', [['E2s_v3', 2, 16], ['E4s_v3', 4, 32]]],
  ['Esv5', 'Memory optimized', 'memory-optimized/esv5-series', [['E2s_v5', 2, 16], ['E4s_v5', 4, 32], ['E8s_v5', 8, 64]]],
  ['Easv5', 'Memory optimized', 'memory-optimized/easv5-series', [['E2as_v5', 2, 16], ['E4as_v5', 4, 32]]],
  ['Fsv2', 'Compute optimized', 'compute-optimized/fsv2-series', [['F2s_v2', 2, 4], ['F4s_v2', 4, 8], ['F8s_v2', 8, 16]]],
  ['NCasT4_v3', 'GPU', 'gpu-accelerated/ncast4v3-series', [['NC4as_T4_v3', 4, 28, '1 NVIDIA T4 (16 GB)']]],
  ['NVadsA10_v5', 'GPU', 'gpu-accelerated/nvadsa10v5-series', [['NV6ads_A10_v5', 6, 55, '1/6 NVIDIA A10 (4 GB)']]],
];

// The 15 sizes shown in the README table.
const POPULAR = [
  'Standard_B1s', 'Standard_B2s', 'Standard_B2ms', 'Standard_B2als_v2', 'Standard_B2as_v2', 'Standard_B4as_v2',
  'Standard_D2s_v3', 'Standard_D2s_v5', 'Standard_D4s_v5', 'Standard_D8s_v5', 'Standard_D2as_v5', 'Standard_D4as_v5',
  'Standard_D2s_v6', 'Standard_E2s_v5', 'Standard_E4s_v5',
];

// ---------- Fetch from the Azure Retail Prices API ----------

const SKUS = SERIES.flatMap(([series, family, docsPath, sizes]) =>
  sizes.map(([size, vcpu, memoryGiB, gpu]) => ({
    sku: `Standard_${size}`,
    name: size.replace(/_/g, ' '),
    slug: `standard-${size.toLowerCase().replace(/_/g, '-')}`,
    series,
    family,
    vcpu,
    memoryGiB,
    ...(gpu ? { gpu } : {}),
    docs: DOCS + docsPath,
  })),
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round4 = (n) => Math.round(n * 10000) / 10000;

async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.json();
      if (attempt >= 4 || (res.status < 500 && res.status !== 429)) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt >= 4) throw err;
    }
    await sleep(2000 * attempt);
  }
}

async function fetchItems(region, currency, skus) {
  const filter = `serviceName eq 'Virtual Machines' and armRegionName eq '${region}' and (${skus
    .map((s) => `armSkuName eq '${s}'`)
    .join(' or ')})`;
  let next = `${API}?currencyCode=${currency}&$filter=${encodeURIComponent(filter)}`;
  const items = [];
  for (let page = 0; next && page < 20; page++) {
    const url = new URL(next);
    if (url.hostname !== 'prices.azure.com') break;
    url.port = '';
    url.searchParams.set('currencyCode', currency);
    const body = await getJson(url.toString());
    items.push(...(body.Items ?? []));
    next = body.NextPageLink || null;
  }
  return items;
}

/** Picks the price fields from one SKU's rows: hourly PAYG and spot, reservation totals for the term. */
function summarise(rows) {
  const latest = {};
  for (const i of rows) {
    if (i.unitOfMeasure !== '1 Hour' || typeof i.retailPrice !== 'number') continue;
    if (/Low Priority/i.test(i.skuName) || !/^Virtual Machines /.test(i.productName) || /Dedicated|Cloud ?Services/i.test(i.productName)) continue;
    const windows = / Windows$/.test(i.productName);
    let key;
    if (i.type === 'Consumption') key = /Spot$/i.test(i.skuName) ? (windows ? 'spotWindows' : 'spotLinux') : windows ? 'windows' : 'linux';
    else if (i.type === 'Reservation' && !windows) key = i.reservationTerm === '1 Year' ? 'r1' : i.reservationTerm === '3 Years' ? 'r3' : null;
    if (!key) continue;
    // Keep the most recent price if Microsoft lists more than one effective date.
    if (!latest[key] || i.effectiveStartDate > latest[key].effectiveStartDate) latest[key] = i;
  }
  const out = {};
  for (const k of ['linux', 'windows', 'r1', 'r3', 'spotLinux', 'spotWindows']) if (latest[k]) out[k] = round4(latest[k].retailPrice);
  return out.linux ? out : null;
}

async function refresh() {
  const prices = Object.fromEntries(SKUS.map((s) => [s.sku, {}]));
  const names = SKUS.map((s) => s.sku);
  let rowsSeen = 0;
  for (const region of REGIONS) {
    for (const currency of CURRENCIES) {
      for (let i = 0; i < names.length; i += 12) {
        const chunk = names.slice(i, i + 12);
        const items = await fetchItems(region.id, currency, chunk);
        rowsSeen += items.length;
        for (const sku of chunk) {
          const p = summarise(items.filter((it) => it.armSkuName === sku));
          if (!p) continue;
          prices[sku][region.id] ??= {};
          prices[sku][region.id][currency] = p;
        }
        await sleep(300);
      }
      console.log(`${region.id} ${currency}: done`);
    }
  }
  const skus = SKUS.map((s) => ({ ...s, prices: prices[s.sku] }));
  const withPrices = skus.filter((s) => Object.keys(s.prices).length);
  if (withPrices.length < SKUS.length * 0.8) {
    throw new Error(`Only ${withPrices.length} of ${SKUS.length} SKUs have prices (${rowsSeen} rows); not writing the file.`);
  }
  const data = {
    fetchedAt: new Date().toISOString().slice(0, 10),
    source: API,
    hoursPerMonth: 730,
    regions: REGIONS,
    currencies: CURRENCIES,
    skus: withPrices,
  };
  fs.mkdirSync(path.dirname(JSON_FILE), { recursive: true });
  fs.writeFileSync(JSON_FILE, JSON.stringify(data) + '\n');
  console.log(`Wrote ${withPrices.length} SKUs, ${rowsSeen} price rows read, fetchedAt ${data.fetchedAt}.`);
  for (const s of skus.filter((x) => !Object.keys(x.prices).length)) console.log(`No prices for ${s.sku}`);
}

if (process.argv.includes('--refresh')) await refresh();

// ---------- CSV ----------

const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
const H = data.hoursPerMonth;
const r2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
const r4 = (n) => (Math.round(n * 10000) / 10000).toFixed(4);

// [price key, os, priceType, hourly(value), monthly(value)]
const KINDS = [
  ['linux', 'linux', 'payg', (v) => v, (v) => v * H],
  ['windows', 'windows', 'payg', (v) => v, (v) => v * H],
  ['r1', 'linux', 'reserved-1y', (v) => v / 12 / H, (v) => v / 12],
  ['r3', 'linux', 'reserved-3y', (v) => v / 36 / H, (v) => v / 36],
  ['spotLinux', 'linux', 'spot', (v) => v, (v) => v * H],
  ['spotWindows', 'windows', 'spot', (v) => v, (v) => v * H],
];

const csv = ['sku,region,currency,os,priceType,hourly,monthly'];
let csvRows = 0;
for (const s of data.skus) {
  for (const reg of data.regions) {
    for (const cur of data.currencies) {
      const p = s.prices[reg.id]?.[cur];
      if (!p) continue;
      for (const [key, os, type, hourly, monthly] of KINDS) {
        if (p[key] === undefined) continue;
        csv.push([s.sku, reg.id, cur, os, type, r4(hourly(p[key])), r2(monthly(p[key]))].join(','));
        csvRows++;
      }
    }
  }
}
fs.writeFileSync(CSV_FILE, csv.join('\n') + '\n');

// ---------- README ----------

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const pct = (part, whole) => Math.round((1 - part / whole) * 100);
const regionName = Object.fromEntries(data.regions.map((r) => [r.id, r.name]));
const bySku = Object.fromEntries(data.skus.map((s) => [s.sku, s]));
const mem = (g) => `${g} GiB`;

const rows = [];
for (const id of POPULAR) {
  const s = bySku[id];
  if (!s) continue;
  const inRegions = data.regions.filter((r) => s.prices[r.id]?.INR?.linux !== undefined);
  if (!inRegions.length) continue;
  const best = inRegions.reduce((a, b) => (s.prices[b.id].INR.linux < s.prices[a.id].INR.linux ? b : a));
  const p = s.prices[best.id].INR;
  const payg = p.linux * H;
  const ri = (total, months) => (total === undefined ? 'n/a' : `${inr(total / months)} (-${pct(total / months, payg)}%)`);
  const ci = s.prices.centralindia?.INR?.linux;
  rows.push(
    `| [${s.name}](${s.docs}) | ${s.vcpu} / ${mem(s.memoryGiB)} | ${regionName[best.id]} | ${inr(payg)} | ${ri(p.r1, 12)} | ${ri(p.r3, 36)} | ${ci === undefined ? 'n/a' : inr(ci * H)} |`,
  );
}

const families = [...new Set(data.skus.map((s) => s.family))];
const R = [];
R.push('# Azure VM prices (India and global regions)', '');
R.push(
  `Open data set of Azure virtual machine retail prices for **${data.skus.length} popular VM sizes** in **${data.regions.length} regions**, in **INR and USD**, with pay-as-you-go (Linux and Windows), 1-year and 3-year reserved instance and spot prices. Last fetched **${data.fetchedAt}** from Microsoft's public Azure Retail Prices API.`,
  '',
);
R.push(
  `Maintained by [EpiFive](${SITE}). Browse every size with region comparisons at [epifive.com/azure/vm-pricing](${SITE}/azure/vm-pricing), or estimate a whole deployment with the interactive [Azure pricing calculator](${SITE}/tools/azure-pricing-calculator).`,
  '',
);
R.push('## Contents', '');
R.push('- [Cheapest region for 15 popular sizes (INR)](#cheapest-region-for-15-popular-sizes-inr)');
R.push('- [What is in the data](#what-is-in-the-data)');
R.push('- [How to refresh](#how-to-refresh)');
R.push('- [Source and disclaimer](#source-and-disclaimer)');
R.push('- [License](#license)', '');

R.push('## Cheapest region for 15 popular sizes (INR)', '');
R.push(
  `Monthly Linux price in the cheapest of the ${data.regions.length} regions, at ${H} hours a month. Reserved instance prices are the term total divided by 12 or 36 months, in the same region, with the saving against pay-as-you-go in brackets. The last column is pay-as-you-go in Central India for comparison.`,
  '',
);
R.push('| VM size | vCPU / RAM | Cheapest region | Pay-as-you-go / month | 1-year reserved / month | 3-year reserved / month | Central India PAYG / month |');
R.push('|---|---|---|---:|---:|---:|---:|');
R.push(...rows, '');
R.push(
  `Prices as of ${data.fetchedAt}. n/a: the retail API lists no reservation price for that size. All prices are for compute only (no disks, bandwidth or support); Windows pay-as-you-go prices include the Windows Server licence. USD prices, Windows, spot and every other region are in the [CSV](data/azure-vm-prices.csv).`,
  '',
);

R.push('## What is in the data', '');
R.push('| File | Contents |', '|---|---|');
R.push(`| [data/azure-vm-prices.json](data/azure-vm-prices.json) | Structured data: regions, currencies and one object per VM size with vCPU, memory, series, family, a Microsoft Learn link and prices per region and currency. |`);
R.push(`| [data/azure-vm-prices.csv](data/azure-vm-prices.csv) | The same prices flattened to ${csvRows.toLocaleString('en-US')} rows: \`sku, region, currency, os, priceType, hourly, monthly\`. |`);
R.push('');
R.push(`**Regions:** ${data.regions.map((r) => `${r.name} (\`${r.id}\`)`).join(', ')}.`, '');
R.push(`**VM families:** ${families.join(', ')}.`, '');
R.push('**Price fields in the JSON** (per SKU, region and currency):', '');
R.push('| Field | Meaning |', '|---|---|');
R.push('| `linux` | Pay-as-you-go price per hour, Linux |');
R.push('| `windows` | Pay-as-you-go price per hour, Windows (licence included) |');
R.push('| `r1` | 1-year reserved instance, total for the whole term (Linux; Windows licence is billed separately) |');
R.push('| `r3` | 3-year reserved instance, total for the whole term |');
R.push('| `spotLinux`, `spotWindows` | Spot price per hour (can be evicted at any time) |');
R.push('');
R.push('**CSV columns:** `priceType` is `payg`, `reserved-1y`, `reserved-3y` or `spot`. `hourly` is the price per hour (for reservations, the term total spread over every hour of the term); `monthly` is hourly × 730 (for reservations, the term total divided by 12 or 36).', '');
R.push('Quick example with Node.js:', '');
R.push('```js');
R.push("const data = JSON.parse(require('fs').readFileSync('data/azure-vm-prices.json', 'utf8'));");
R.push("const d2 = data.skus.find((s) => s.sku === 'Standard_D2s_v5');");
R.push('console.log(d2.prices.centralindia.INR.linux * data.hoursPerMonth); // monthly Linux PAYG in INR');
R.push('```', '');

R.push('## How to refresh', '');
R.push('The generator calls the public [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) directly. No Azure account, key or dependencies are needed, only Node.js 18 or later:', '');
R.push('```sh');
R.push('node generate.mjs --refresh   # fetch new prices, then rebuild the CSV and this README');
R.push('node generate.mjs             # rebuild the CSV and README from the existing JSON');
R.push('```', '');
R.push('A refresh makes about 150 requests and takes a minute or two. To add sizes or regions, edit the `SERIES`, `REGIONS` or `POPULAR` lists at the top of `generate.mjs`. The script refuses to write the file if fewer than 80% of sizes return prices, so a partial API outage cannot wipe the data.', '');

R.push('## Source and disclaimer', '');
R.push(`- **Source:** Microsoft's public Azure Retail Prices API (\`${data.source}\`). vCPU and memory figures come from the Microsoft Learn size-series page linked from each size.`);
R.push('- These are **retail list prices**. Your actual bill depends on your agreement (EA, MCA, CSP), discounts, Azure Hybrid Benefit, savings plans, taxes and exchange rates, and does not include disks, networking or other services.');
R.push('- Microsoft changes prices at any time. Always confirm with the [Azure pricing calculator](https://azure.microsoft.com/en-us/pricing/calculator/) or your Azure portal before you commit.');
R.push('- This project is not affiliated with or endorsed by Microsoft. Azure is a trademark of Microsoft Corporation.', '');

R.push('## License', '');
R.push('The code (`generate.mjs`) is released under the [MIT License](LICENSE). The price data is published by Microsoft through its public Retail Prices API; this repository only collects and reformats it. If you reuse the data set, a link back to this repository or to [epifive.com/azure/vm-pricing](' + SITE + '/azure/vm-pricing) is appreciated.', '');
R.push('Found a wrong number or a missing size? Open an issue with the **Correction** template and include the official Azure pricing or Microsoft Learn link.', '');
R.push('---', '');
R.push(`Made by [EpiFive](${SITE}): practical IT, cloud and networking guides.`, '');
fs.writeFileSync(path.join(HERE, 'README.md'), R.join('\n'));

// ---------- Issue template and repo metadata ----------

fs.mkdirSync(path.join(HERE, '.github', 'ISSUE_TEMPLATE'), { recursive: true });
fs.writeFileSync(
  path.join(HERE, '.github', 'ISSUE_TEMPLATE', 'correction.md'),
  `---
name: Correction
about: Report a wrong price, size specification or missing VM size, with the official link
title: "[Correction] <VM size> in <region>"
labels: correction
---

**VM size and region**
<!-- For example: Standard_D2s_v5 in centralindia -->

**What is wrong**
<!-- Price, vCPU or memory figure, missing reservation price, missing size or region -->

**Correct value**
<!-- What it should be, with the currency and price type (pay-as-you-go, 1-year, 3-year, spot) -->

**Official link (required)**
<!-- A link to the Azure pricing page, the Azure Retail Prices API response or the Microsoft Learn
     size page that shows the correct value. Corrections without an official source cannot be accepted. -->
`,
);

fs.writeFileSync(
  path.join(HERE, 'REPO_META.md'),
  `# Repository metadata

For the GitHub "About" box.

**Name:** azure-vm-prices

**Description:** Azure VM retail prices for ${data.skus.length} sizes in ${data.regions.length} regions (Central/South/West India, East US, West Europe, Southeast Asia) in INR and USD: PAYG, reserved and spot. JSON + CSV.

**Website:** ${SITE}/azure/vm-pricing

**Topics (13):**

azure, azure-pricing, azure-vm, virtual-machines, cloud-pricing, cloud-cost, finops, open-data, dataset, csv, json, azure-india, reserved-instances
`,
);

console.log(`Wrote ${CSV_FILE} (${csvRows} rows) and README.md with ${rows.length} popular sizes. Data fetched ${data.fetchedAt}.`);
