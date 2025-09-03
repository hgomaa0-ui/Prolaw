/**
 * Simple in-memory cache of exchange rates for 1 hour.
 */
const CACHE: Record<string, { ts: number; rate: number }> = {};
const TTL_MS = 60 * 60 * 1000; // 1 hour

/** Fetch exchange rate from `from` -> `to` using exchangerate.host */
async function getRate(from: string, to: string): Promise<number> {
  const key = `${from}_${to}`;
  const now = Date.now();
  if (CACHE[key] && now - CACHE[key].ts < TTL_MS) {
    return CACHE[key].rate;
  }
  const apiKey = process.env.FX_API_KEY;
  let rate: number | undefined;
  if (apiKey) {
    // use exchangerate.host with key
    const url = `https://api.exchangerate.host/convert?from=${from}&to=${to}&access_key=${apiKey}`;
    const res = await fetch(url);
    const data: any = await res.json();
    console.log('FX data', { url, from, to, apiKeyPresent: true, data });
    rate = Number(data?.result ?? data?.info?.rate);
  }
  // if no key or rate failed, use open.er-api.com free endpoint
  if (!rate || isNaN(rate) || rate <= 0) {
    try {
      const altUrl = `https://open.er-api.com/v6/latest/${from}`;
      const alt = await fetch(altUrl);
      const altJson: any = await alt.json();
      const altRate = Number(altJson?.rates?.[to]);
      console.log('FX alt', { altUrl, altRate });
      if (altRate && !isNaN(altRate)) rate = altRate;
    } catch {
      // ignore
    }
  }
  if (!rate || isNaN(rate) || rate <= 0) {
    // final fallback static table
    const staticRates: Record<string, number> = {
      'USD_EGP': 30.5,
      'EGP_USD': 1/30.5,
      'USD_SAR': 3.75,
      'SAR_USD': 1/3.75
    };
    const k = `${from}_${to}`;
    rate = staticRates[k] || 1;
  }
  console.log('FX final rate', { from, to, rate });
  CACHE[key] = { ts: now, rate };
  return rate;
}

/** Convert amount from `from` currency to `to` currency */
export async function convert(amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount;
  try {
    const rate = await getRate(from, to);
    return amount * rate;
  } catch (err) {
    console.error('FX fetch error, using fallback rate 1', err);
    return amount; // fallback: no conversion
  }
}
