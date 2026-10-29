# Azure VM prices (India and global regions)

Open data set of Azure virtual machine retail prices for **43 popular VM sizes** in **6 regions**, in **INR and USD**, with pay-as-you-go (Linux and Windows), 1-year and 3-year reserved instance and spot prices. Last fetched **2026-10-28** from Microsoft's public Azure Retail Prices API.

Maintained by [EpiFive](https://www.epifive.com). Browse every size with region comparisons at [epifive.com/azure/vm-pricing](https://www.epifive.com/azure/vm-pricing), or estimate a whole deployment with the interactive [Azure pricing calculator](https://www.epifive.com/tools/azure-pricing-calculator).

## Contents

- [Cheapest region for 15 popular sizes (INR)](#cheapest-region-for-15-popular-sizes-inr)
- [What is in the data](#what-is-in-the-data)
- [How to refresh](#how-to-refresh)
- [Source and disclaimer](#source-and-disclaimer)
- [License](#license)

## Cheapest region for 15 popular sizes (INR)

Monthly Linux price in the cheapest of the 6 regions, at 730 hours a month. Reserved instance prices are the term total divided by 12 or 36 months, in the same region, with the saving against pay-as-you-go in brackets. The last column is pay-as-you-go in Central India for comparison.

| VM size | vCPU / RAM | Cheapest region | Pay-as-you-go / month | 1-year reserved / month | 3-year reserved / month | Central India PAYG / month |
|---|---|---|---:|---:|---:|---:|
| [B1s](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/bv1-series) | 1 / 1 GiB | East US (Virginia) | ₹729 | n/a | n/a | ₹785 |
| [B2s](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/bv1-series) | 2 / 4 GiB | East US (Virginia) | ₹2,915 | n/a | n/a | ₹3,139 |
| [B2ms](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/bv1-series) | 2 / 8 GiB | East US (Virginia) | ₹5,830 | n/a | n/a | ₹6,279 |
| [B2als v2](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/basv2-series) | 2 / 4 GiB | Central India (Pune) | ₹1,724 | ₹1,016 (-41%) | ₹637 (-63%) | ₹1,724 |
| [B2as v2](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/basv2-series) | 2 / 8 GiB | Central India (Pune) | ₹3,448 | ₹2,032 (-41%) | ₹1,275 (-63%) | ₹3,448 |
| [B4as v2](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/basv2-series) | 4 / 16 GiB | Central India (Pune) | ₹6,895 | ₹4,072 (-41%) | ₹2,552 (-63%) | ₹6,895 |
| [D2s v3](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv3-series) | 2 / 8 GiB | East US (Virginia) | ₹6,727 | n/a | n/a | ₹7,358 |
| [D2s v5](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv5-series) | 2 / 8 GiB | East US (Virginia) | ₹6,727 | ₹4,152 (-38%) | ₹2,658 (-60%) | ₹7,077 |
| [D4s v5](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv5-series) | 4 / 16 GiB | East US (Virginia) | ₹13,454 | ₹8,303 (-38%) | ₹5,314 (-61%) | ₹14,155 |
| [D8s v5](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv5-series) | 8 / 32 GiB | East US (Virginia) | ₹26,908 | ₹16,598 (-38%) | ₹10,628 (-61%) | ₹28,309 |
| [D2as v5](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dasv5-series) | 2 / 8 GiB | Central India (Pune) | ₹3,896 | ₹2,400 (-38%) | ₹1,538 (-61%) | ₹3,896 |
| [D4as v5](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dasv5-series) | 4 / 16 GiB | Central India (Pune) | ₹7,778 | ₹4,799 (-38%) | ₹3,074 (-60%) | ₹7,778 |
| [D2s v6](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv6-series) | 2 / 8 GiB | East US (Virginia) | ₹7,077 | ₹4,376 (-38%) | ₹2,754 (-61%) | ₹7,428 |
| [E2s v5](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/esv5-series) | 2 / 16 GiB | East US (Virginia) | ₹8,829 | ₹5,207 (-41%) | ₹3,488 (-60%) | ₹9,109 |
| [E4s v5](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/esv5-series) | 4 / 32 GiB | East US (Virginia) | ₹17,658 | ₹10,415 (-41%) | ₹6,975 (-60%) | ₹18,219 |

Prices as of 2026-10-28. n/a: the retail API lists no reservation price for that size. All prices are for compute only (no disks, bandwidth or support); Windows pay-as-you-go prices include the Windows Server licence. USD prices, Windows, spot and every other region are in the [CSV](data/azure-vm-prices.csv).

## What is in the data

| File | Contents |
|---|---|
| [data/azure-vm-prices.json](data/azure-vm-prices.json) | Structured data: regions, currencies and one object per VM size with vCPU, memory, series, family, a Microsoft Learn link and prices per region and currency. |
| [data/azure-vm-prices.csv](data/azure-vm-prices.csv) | The same prices flattened to 2,508 rows: `sku, region, currency, os, priceType, hourly, monthly`. |

**Regions:** Central India (Pune) (`centralindia`), South India (Chennai) (`southindia`), West India (Mumbai) (`westindia`), East US (Virginia) (`eastus`), West Europe (Netherlands) (`westeurope`), Southeast Asia (Singapore) (`southeastasia`).

**VM families:** Burstable, Entry level, General purpose, Memory optimized, Compute optimized, GPU.

**Price fields in the JSON** (per SKU, region and currency):

| Field | Meaning |
|---|---|
| `linux` | Pay-as-you-go price per hour, Linux |
| `windows` | Pay-as-you-go price per hour, Windows (licence included) |
| `r1` | 1-year reserved instance, total for the whole term (Linux; Windows licence is billed separately) |
| `r3` | 3-year reserved instance, total for the whole term |
| `spotLinux`, `spotWindows` | Spot price per hour (can be evicted at any time) |

**CSV columns:** `priceType` is `payg`, `reserved-1y`, `reserved-3y` or `spot`. `hourly` is the price per hour (for reservations, the term total spread over every hour of the term); `monthly` is hourly × 730 (for reservations, the term total divided by 12 or 36).

Quick example with Node.js:

```js
const data = JSON.parse(require('fs').readFileSync('data/azure-vm-prices.json', 'utf8'));
const d2 = data.skus.find((s) => s.sku === 'Standard_D2s_v5');
console.log(d2.prices.centralindia.INR.linux * data.hoursPerMonth); // monthly Linux PAYG in INR
```

## How to refresh

The generator calls the public [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) directly. No Azure account, key or dependencies are needed, only Node.js 18 or later:

```sh
node generate.mjs --refresh   # fetch new prices, then rebuild the CSV and this README
node generate.mjs             # rebuild the CSV and README from the existing JSON
```

A refresh makes about 150 requests and takes a minute or two. To add sizes or regions, edit the `SERIES`, `REGIONS` or `POPULAR` lists at the top of `generate.mjs`. The script refuses to write the file if fewer than 80% of sizes return prices, so a partial API outage cannot wipe the data.

## Source and disclaimer

- **Source:** Microsoft's public Azure Retail Prices API (`https://prices.azure.com/api/retail/prices`). vCPU and memory figures come from the Microsoft Learn size-series page linked from each size.
- These are **retail list prices**. Your actual bill depends on your agreement (EA, MCA, CSP), discounts, Azure Hybrid Benefit, savings plans, taxes and exchange rates, and does not include disks, networking or other services.
- Microsoft changes prices at any time. Always confirm with the [Azure pricing calculator](https://azure.microsoft.com/en-us/pricing/calculator/) or your Azure portal before you commit.
- This project is not affiliated with or endorsed by Microsoft. Azure is a trademark of Microsoft Corporation.

## License

The code (`generate.mjs`) is released under the [MIT License](LICENSE). The price data is published by Microsoft through its public Retail Prices API; this repository only collects and reformats it. If you reuse the data set, a link back to this repository or to [epifive.com/azure/vm-pricing](https://www.epifive.com/azure/vm-pricing) is appreciated.

Found a wrong number or a missing size? Open an issue with the **Correction** template and include the official Azure pricing or Microsoft Learn link.

---

Made by [EpiFive](https://www.epifive.com): practical IT, cloud and networking guides.
