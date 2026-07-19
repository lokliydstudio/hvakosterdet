const kr = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const AREA_NAMES = {
  NO1: 'NO1 – Øst-Norge',
  NO2: 'NO2 – Sørvest-Norge',
  NO3: 'NO3 – Midt-Norge',
  NO4: 'NO4 – Nord-Norge',
  NO5: 'NO5 – Vest-Norge'
};

const spotState = {
  area: localStorage.getItem('priceArea') || 'NO1',
  current: null,
  average: null,
  rawCurrent: null,
  loading: false,
  lastUpdated: null
};

const val = id => Number(document.getElementById(id)?.value) || 0;
const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

function osloDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return parts;
}

function priceApiUrl(area) {
  const { year, month, day } = osloDateParts();
  return `https://www.hvakosterstrommen.no/api/v1/prices/${year}/${month}-${day}_${area}.json`;
}

function withConsumerVat(price, area) {
  return price * (area === 'NO4' ? 1 : 1.25);
}

function getEnergyPrice() {
  const mode = document.getElementById('priceMode')?.value || 'current';
  if (mode === 'manual') return val('manualSpotPrice');
  if (mode === 'average') return spotState.average ?? val('manualSpotPrice') ?? 1;
  return spotState.current ?? spotState.average ?? val('manualSpotPrice') ?? 1;
}

function activePriceLabel() {
  const mode = document.getElementById('priceMode')?.value;
  if (mode === 'manual') return 'Egen spotpris';
  if (mode === 'average') return 'Dagens gjennomsnitt';
  return 'Spotpris akkurat nå';
}

function updateSpotSummary(message = '') {
  const mode = document.getElementById('priceMode').value;
  const used = getEnergyPrice();
  setText('spotAreaName', AREA_NAMES[spotState.area]);
  setText('spotPriceAverage', spotState.average === null ? '–' : `${kr.format(spotState.average)}/kWh`);

  if (spotState.loading) {
    setText('spotPriceNow', 'Henter spotpris …');
  } else if (mode === 'manual') {
    setText('spotPriceNow', `${kr.format(used)}/kWh`);
  } else if (spotState.current !== null || spotState.average !== null) {
    setText('spotPriceNow', `${kr.format(used)}/kWh`);
  } else {
    setText('spotPriceNow', 'Bruker reservepris');
  }

  const vatText = spotState.area === 'NO4' ? 'uten mva. (NO4)' : 'inkl. 25 % mva.';
  setText('spotPricePeriod', message || `${activePriceLabel()}, ${vatText}`);
  calculateAll();
}

async function fetchSpotPrice({ force = false } = {}) {
  if (spotState.loading && !force) return;
  spotState.loading = true;
  updateSpotSummary();
  try {
    const response = await fetch(priceApiUrl(spotState.area), { cache: force ? 'reload' : 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const prices = await response.json();
    if (!Array.isArray(prices) || prices.length === 0) throw new Error('Ingen priser mottatt');

    const now = Date.now();
    const current = prices.find(item => now >= Date.parse(item.time_start) && now < Date.parse(item.time_end))
      || prices.reduce((closest, item) => {
        const distance = Math.abs(Date.parse(item.time_start) - now);
        return !closest || distance < closest.distance ? { item, distance } : closest;
      }, null)?.item;

    const rawAverage = prices.reduce((sum, item) => sum + Number(item.NOK_per_kWh), 0) / prices.length;
    spotState.rawCurrent = Number(current?.NOK_per_kWh ?? rawAverage);
    spotState.current = withConsumerVat(spotState.rawCurrent, spotState.area);
    spotState.average = withConsumerVat(rawAverage, spotState.area);
    spotState.lastUpdated = new Date();
    localStorage.setItem(`spot-${spotState.area}`, JSON.stringify({
      date: `${osloDateParts().year}-${osloDateParts().month}-${osloDateParts().day}`,
      current: spotState.current,
      average: spotState.average
    }));
    updateSpotSummary();
  } catch (error) {
    const cached = localStorage.getItem(`spot-${spotState.area}`);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        const today = Object.values(osloDateParts()).join('-');
        if (data.date === today) {
          spotState.current = data.current;
          spotState.average = data.average;
          updateSpotSummary('Mellomlagret spotpris – oppdatering feilet');
          return;
        }
      } catch (_) {}
    }
    spotState.current = null;
    spotState.average = null;
    document.getElementById('priceMode').value = 'manual';
    document.getElementById('manualPriceLabel').hidden = false;
    updateSpotSummary('Kunne ikke hente pris. Skriv inn spotprisen manuelt.');
    console.warn('Spotpris kunne ikke hentes:', error);
  } finally {
    spotState.loading = false;
    updateSpotSummary(document.getElementById('spotPricePeriod').textContent.includes('feilet') || document.getElementById('spotPricePeriod').textContent.includes('Kunne') ? document.getElementById('spotPricePeriod').textContent : '');
  }
}

function applyPostalCode() {
  const input = document.getElementById('postalCode');
  const code = input.value.replace(/\D/g, '').slice(0, 4).padStart(input.value.length ? 4 : 0, '0');
  input.value = code;
  if (code.length !== 4) {
    setText('postalStatus', 'Skriv inn fire siffer.');
    return;
  }
  const record = POSTAL_DATA[code];
  if (!record) {
    setText('postalStatus', 'Postnummeret ble ikke funnet. Velg prisområde manuelt.');
    return;
  }
  const [place, area] = record;
  if (!area) {
    setText('postalStatus', `${code} ${place} er utenfor de fem fastlandsområdene. Velg område manuelt.`);
    return;
  }
  setText('postalStatus', `${code} ${place}: automatisk forslag ${AREA_NAMES[area]}.`);
  if (area !== spotState.area) {
    spotState.area = area;
    document.getElementById('priceArea').value = area;
    localStorage.setItem('priceArea', area);
    fetchSpotPrice();
  } else {
    updateSpotSummary();
  }
  localStorage.setItem('postalCode', code);
}

function calculateShower() {
  const minutes = val('showerMinutes');
  const liters = minutes * val('showerFlow');
  const waterCost = liters * val('showerWaterPrice');
  const energyKwh = liters * 30 * 0.001163;
  const energyCost = energyKwh * getEnergyPrice();
  const total = waterCost + energyCost;
  const weekly = total * val('showersPerWeek');
  setText('showerMinutesOut', minutes);
  setText('showerResult', kr.format(total));
  setText('showerMonthly', kr.format(weekly * 52 / 12));
  setText('showerYearly', kr.format(weekly * 52));
  return total;
}

function calculateEv() {
  const gridEnergy = val('evKwh') / (1 - Math.min(val('evLoss'), 95) / 100);
  const one = gridEnergy * getEnergyPrice();
  const monthly = one * val('evCharges');
  setText('evResult', kr.format(one));
  setText('evMonthly', kr.format(monthly));
  setText('evYearly', kr.format(monthly * 12));
  return one;
}

function calculateAppliance() {
  const one = val('applianceKwh') * getEnergyPrice();
  const weekly = one * val('applianceUses');
  setText('applianceResult', kr.format(one));
  setText('applianceMonthly', kr.format(weekly * 52 / 12));
  setText('applianceYearly', kr.format(weekly * 52));
  return one;
}

function calculateHeating() {
  const purchasedEnergy = val('heatingArea') * val('heatingNeed') * val('heatingFactor');
  const yearly = purchasedEnergy * getEnergyPrice();
  setText('heatingResult', kr.format(yearly) + ' / år');
  setText('heatingMonthly', kr.format(yearly / 12));
  setText('heatingEnergy', number.format(purchasedEnergy) + ' kWh/år');
}

function calculateOwnership() {
  const yearly = val('ownerInsurance') + val('ownerMaintenance') + val('ownerDepreciation') + val('ownerBuffer') + val('ownerRunning') * 12;
  setText('ownerResult', kr.format(yearly));
  setText('ownerMonthly', kr.format(yearly / 12));
  setText('ownerWeekly', kr.format(yearly / 52));
}

function calculateAll() {
  const shower = calculateShower();
  const ev = calculateEv();
  const appliance = calculateAppliance();
  calculateHeating();
  calculateOwnership();
  setText('heroShower', kr.format(shower));
  setText('heroEv', kr.format(ev));
  setText('heroAppliance', kr.format(appliance));
  setText('heroTotal', kr.format(shower + ev + appliance));
  setText('heroPriceNote', `${activePriceLabel()} i ${spotState.area}: ${kr.format(getEnergyPrice())}/kWh. Nettleie og påslag er ikke med.`);
}

document.querySelectorAll('.calc-form input, .calc-form select').forEach(el => el.addEventListener('input', calculateAll));

document.getElementById('appliancePreset').addEventListener('change', event => {
  if (event.target.value !== 'custom') {
    document.getElementById('applianceKwh').value = event.target.value;
    calculateAppliance();
  }
});

document.getElementById('priceArea').value = spotState.area;
document.getElementById('priceArea').addEventListener('change', event => {
  spotState.area = event.target.value;
  localStorage.setItem('priceArea', spotState.area);
  setText('postalStatus', `Manuelt valgt ${AREA_NAMES[spotState.area]}.`);
  fetchSpotPrice();
});

document.getElementById('priceMode').addEventListener('change', event => {
  document.getElementById('manualPriceLabel').hidden = event.target.value !== 'manual';
  localStorage.setItem('priceMode', event.target.value);
  updateSpotSummary();
});

document.getElementById('manualSpotPrice').addEventListener('input', updateSpotSummary);
document.getElementById('postalLookup').addEventListener('click', applyPostalCode);
document.getElementById('postalCode').addEventListener('input', event => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
  if (event.target.value.length === 4) applyPostalCode();
});
document.getElementById('postalCode').addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); applyPostalCode(); }
});
document.getElementById('refreshPrice').addEventListener('click', () => fetchSpotPrice({ force: true }));

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(item => {
      item.classList.remove('active');
      item.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.calculator-panel').forEach(panel => {
      panel.classList.remove('active');
      panel.hidden = true;
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const panel = document.getElementById(`panel-${tab.dataset.tab}`);
    panel.classList.add('active');
    panel.hidden = false;
  });
});

const menuButton = document.getElementById('menuButton');
const mainNav = document.getElementById('mainNav');
menuButton.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

document.getElementById('newsletterForm').addEventListener('submit', event => {
  event.preventDefault();
  document.getElementById('newsletterMessage').textContent = 'Takk! I en publisert versjon kobles dette til en e-posttjeneste.';
  event.target.reset();
});

document.getElementById('cookieClose').addEventListener('click', () => {
  document.getElementById('cookieBanner').hidden = true;
});

document.getElementById('year').textContent = new Date().getFullYear();
const savedMode = localStorage.getItem('priceMode');
if (savedMode && ['current','average','manual'].includes(savedMode)) {
  document.getElementById('priceMode').value = savedMode;
  document.getElementById('manualPriceLabel').hidden = savedMode !== 'manual';
}
const savedPostal = localStorage.getItem('postalCode');
if (savedPostal) document.getElementById('postalCode').value = savedPostal;
calculateAll();
fetchSpotPrice();
