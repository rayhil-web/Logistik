
function formatEuro(value){
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function getCheckedValues(name){
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);
}

const form = document.getElementById('transportForm');
const priceOutput = document.getElementById('priceOutput');
const priceDetails = document.getElementById('priceDetails');
const routeStatus = document.getElementById('routeStatus');
const routeBtn = document.getElementById('routeBtn');
const resetBtn = document.getElementById('resetBtn');
const distanceInput = document.getElementById('distance');
const yearEl = document.getElementById('year');

const KM_RATE = 1.90;
const PACKAGING = 50.00;

function calculatePrice(){
  const km = Number(distanceInput?.value || 0);
  const total = (km * KM_RATE) + PACKAGING;
  if(priceOutput) priceOutput.textContent = formatEuro(total);
  if(priceDetails) priceDetails.textContent = `${km.toFixed(1).replace('.', ',')} km × ${formatEuro(KM_RATE)} + ${formatEuro(PACKAGING)} Verpackungsmaterial`;
  return { km, total };
}

async function geocodeAddress(address){
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  if(!response.ok) throw new Error('Geocoding fehlgeschlagen');
  const data = await response.json();
  if(!data || !data.length) throw new Error('Adresse nicht gefunden');
  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
    label: data[0].display_name
  };
}

async function calculateRouteKm(){
  const pickup = document.getElementById('pickup')?.value.trim();
  const dropoff = document.getElementById('dropoff')?.value.trim();

  if(!pickup || !dropoff){
    if(routeStatus) routeStatus.textContent = 'Bitte zuerst Einladeort und Abladeort eingeben.';
    return;
  }

  try{
    if(routeBtn) routeBtn.disabled = true;
    if(routeStatus) routeStatus.textContent = 'Entfernung wird berechnet...';

    const [from, to] = await Promise.all([geocodeAddress(pickup), geocodeAddress(dropoff)]);
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const routeRes = await fetch(routeUrl);
    if(!routeRes.ok) throw new Error('Routenberechnung fehlgeschlagen');
    const routeData = await routeRes.json();

    if(!routeData.routes || !routeData.routes.length){
      throw new Error('Keine Route gefunden');
    }

    const km = routeData.routes[0].distance / 1000;
    if(distanceInput) distanceInput.value = km.toFixed(1);
    const { total } = calculatePrice();
    if(routeStatus) routeStatus.textContent = `Automatisch berechnet: ${km.toFixed(1).replace('.', ',')} km • Gesamtpreis: ${formatEuro(total)}`;
  }catch(error){
    if(routeStatus) routeStatus.textContent = 'Automatische Berechnung war nicht möglich. Bitte Kilometer manuell eintragen.';
  }finally{
    if(routeBtn) routeBtn.disabled = false;
  }
}

if(routeBtn){
  routeBtn.addEventListener('click', calculateRouteKm);
}
if(distanceInput){
  distanceInput.addEventListener('input', calculatePrice);
  calculatePrice();
}
if(resetBtn && form){
  resetBtn.addEventListener('click', () => {
    form.reset();
    if(routeStatus) routeStatus.textContent = '';
    calculatePrice();
  });
}
if(yearEl){
  yearEl.textContent = new Date().getFullYear();
}

if(form){
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const { km, total } = calculatePrice();
    const name = document.getElementById('name')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim() || '';
    const phone = document.getElementById('phone')?.value.trim() || '';
    const weight = document.getElementById('weight')?.value || '';
    const pickup = document.getElementById('pickup')?.value.trim() || '';
    const dropoff = document.getElementById('dropoff')?.value.trim() || '';
    const message = document.getElementById('message')?.value.trim() || '';
    const customItems = document.getElementById('customItems')?.value.trim() || '';
    const items = getCheckedValues('items');

    const body = [
      'Neue Anfrage über die Webseite Blanke Logistik',
      '',
      `Name: ${name}`,
      `E-Mail: ${email}`,
      `Telefon: ${phone || '-'}`,
      '',
      `Möbelstücke: ${items.length ? items.join(', ') : '-'}`,
      `Weitere Möbel / Hinweise: ${customItems || '-'}`,
      `Gewicht: ${weight}`,
      '',
      `Einladeort: ${pickup}`,
      `Abladeort: ${dropoff}`,
      `Entfernung: ${km.toFixed(1).replace('.', ',')} km`,
      `Gesamtpreis: ${formatEuro(total)}`,
      '',
      'Zusätzliche Informationen:',
      message || '-'
    ].join('\n');

    const subject = `Neue Anfrage Blanke Logistik von ${name}`;
    window.location.href = `mailto:rayhil@freenet.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}
