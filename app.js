const kr = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });

const val = id => Number(document.getElementById(id).value) || 0;
const setText = (id, value) => { document.getElementById(id).textContent = value; };

function calculateShower() {
  const minutes = val('showerMinutes');
  const liters = minutes * val('showerFlow');
  const waterCost = liters * val('showerWaterPrice');
  // Heating water from roughly 8°C to 38°C: 0.001163 kWh per liter per °C.
  const energyKwh = liters * 30 * 0.001163;
  const energyCost = energyKwh * val('showerPowerPrice');
  const total = waterCost + energyCost;
  const weekly = total * val('showersPerWeek');
  setText('showerMinutesOut', minutes);
  setText('showerResult', kr.format(total));
  setText('showerMonthly', kr.format(weekly * 52 / 12));
  setText('showerYearly', kr.format(weekly * 52));
}

function calculateEv() {
  const gridEnergy = val('evKwh') / (1 - Math.min(val('evLoss'), 95) / 100);
  const one = gridEnergy * val('evPrice');
  const monthly = one * val('evCharges');
  setText('evResult', kr.format(one));
  setText('evMonthly', kr.format(monthly));
  setText('evYearly', kr.format(monthly * 12));
}

function calculateAppliance() {
  const one = val('applianceKwh') * val('appliancePrice');
  const weekly = one * val('applianceUses');
  setText('applianceResult', kr.format(one));
  setText('applianceMonthly', kr.format(weekly * 52 / 12));
  setText('applianceYearly', kr.format(weekly * 52));
}

function calculateHeating() {
  const purchasedEnergy = val('heatingArea') * val('heatingNeed') * val('heatingFactor');
  const yearly = purchasedEnergy * val('heatingPrice');
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
  calculateShower();
  calculateEv();
  calculateAppliance();
  calculateHeating();
  calculateOwnership();
}

document.querySelectorAll('input, select').forEach(el => el.addEventListener('input', calculateAll));

document.getElementById('appliancePreset').addEventListener('change', event => {
  if (event.target.value !== 'custom') {
    document.getElementById('applianceKwh').value = event.target.value;
    calculateAppliance();
  }
});

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
calculateAll();
