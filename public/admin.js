const STATUS_OPTIONS = ["New", "Confirmed", "Checked in", "Cancelled"];
const QR_COLLECTION = "qrPasses";
const SCAN_COLLECTION = "scanRecords";

let filters = {
  search: "",
  category: "all",
  status: "all",
};

let qrScanner = null;
let scannerExpectedRegistrationId = "";
let scannerExpectedName = "";
let scannerBusy = false;
let scannerStarting = false;
let currentPdf = null;
let adminEventsCache = [];
let adminGamesCache = [];
let editingGameGroup = "";
let gameFilters = {
  search: "",
  date: "all",
  group: "all",
  status: "all",
};

const COUNTRY_OPTIONS = [
  ["DZ", "Algeria"],
  ["AR", "Argentina"],
  ["AU", "Australia"],
  ["AT", "Austria"],
  ["BA", "Bosnia and Herzegovina"],
  ["BE", "Belgium"],
  ["BR", "Brazil"],
  ["CN", "China"],
  ["CV", "Cabo Verde"],
  ["CA", "Canada"],
  ["CH", "Switzerland"],
  ["CO", "Colombia"],
  ["CG", "Congo"],
  ["CR", "Costa Rica"],
  ["CW", "Curacao"],
  ["HR", "Croatia"],
  ["CZ", "Czechia"],
  ["DK", "Denmark"],
  ["EC", "Ecuador"],
  ["EG", "Egypt"],
  ["ENG", "England"],
  ["FR", "France"],
  ["DE", "Germany"],
  ["GH", "Ghana"],
  ["HT", "Haiti"],
  ["IQ", "Iraq"],
  ["IR", "Iran"],
  ["CI", "Ivory Coast"],
  ["IT", "Italy"],
  ["JP", "Japan"],
  ["JO", "Jordan"],
  ["KR", "South Korea"],
  ["MA", "Morocco"],
  ["ES", "Spain"],
  ["GB", "United Kingdom"],
  ["MX", "Mexico"],
  ["NL", "Netherlands"],
  ["NO", "Norway"],
  ["NZ", "New Zealand"],
  ["PA", "Panama"],
  ["PY", "Paraguay"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["QA", "Qatar"],
  ["SA", "Saudi Arabia"],
  ["SCO", "Scotland"],
  ["SN", "Senegal"],
  ["SE", "Sweden"],
  ["TN", "Tunisia"],
  ["TR", "Turkey"],
  ["US", "USA"],
  ["UY", "Uruguay"],
  ["UZ", "Uzbekistan"],
  ["ZA", "South Africa"],
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function matchesFilters(registration) {
  const haystack = [
    registration.confirmation,
    registration.passCode,
    registration.fullName,
    registration.email,
    registration.phone,
    registration.categoryName,
    registration.gender,
    ...(registration.tickets || []).map((ticket) => ticket.categoryName),
  ]
    .join(" ")
    .toLowerCase();

  const matchesSearch = haystack.includes(filters.search.toLowerCase());
  const matchesCategory =
    filters.category === "all" ||
    (filters.category === "multiple"
      ? (registration.tickets || []).filter((ticket) => Number(ticket.quantity || 0) > 0).length > 1
      : registration.categoryId === filters.category ||
        (registration.tickets || []).some((ticket) => ticket.categoryId === filters.category));
  const matchesStatus = filters.status === "all" || registration.status === filters.status;
  return matchesSearch && matchesCategory && matchesStatus;
}

function formatDate(value) {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderStats(registrations) {
  const tickets = registrations.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const revenue = registrations.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const vipTickets = registrations.reduce((sum, item) => {
    if (item.tickets?.length) {
      return (
        sum +
        item.tickets
          .filter((ticket) => ticket.categoryId.includes("vip"))
          .reduce((ticketSum, ticket) => ticketSum + Number(ticket.quantity || 0), 0)
      );
    }
    return item.categoryId?.includes("vip") ? sum + Number(item.quantity || 0) : sum;
  }, 0);

  document.querySelector("#statRegistrations").textContent = registrations.length;
  document.querySelector("#statTickets").textContent = tickets;
  document.querySelector("#statRevenue").textContent = formatMoney(revenue);
  document.querySelector("#statVip").textContent = vipTickets;
}

function renderTicketSummary(registration) {
  if (!registration.tickets?.length) return escapeHtml(registration.categoryName || "");
  return registration.tickets
    .map((ticket) => {
      const eventText = [ticket.eventDate, ticket.game || ticket.eventTitle, ticket.eventTime].filter(Boolean).join(" - ");
      return `${escapeHtml(ticket.categoryName)} x${Number(ticket.quantity || 0)}${
        eventText ? `<br><span class="cell-muted">${escapeHtml(eventText)}</span>` : ""
      }`;
    })
    .join("<br>");
}

function renderTicketText(registration) {
  if (!registration.tickets?.length) return registration.categoryName || "";
  return registration.tickets
    .map((ticket) => {
      const eventText = [ticket.eventDate, ticket.game || ticket.eventTitle, ticket.eventTime].filter(Boolean).join(" - ");
      return `${ticket.categoryName} x${ticket.quantity}${eventText ? ` (${eventText})` : ""}`;
    })
    .join(", ");
}

function registrationEventText(registration) {
  return [registration.eventDate, registration.game || registration.eventTitle, registration.eventTime]
    .filter(Boolean)
    .join(" - ");
}

function bindAdminActions(root) {
  root.querySelectorAll("[data-status-id]").forEach((select) => {
    select.addEventListener("change", () => updateStatus(select.dataset.statusId, select.value));
  });
  root.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteRegistration(button.dataset.deleteId));
  });
  root.querySelectorAll("[data-pdf-id]").forEach((button) => {
    button.addEventListener("click", () => generateAndSharePdf(button.dataset.pdfId, button));
  });
  root.querySelectorAll("[data-scan-id]").forEach((button) => {
    button.addEventListener("click", () => openGuestScanner(button.dataset.scanId));
  });
  root.querySelectorAll("[data-call-id]").forEach((button) => {
    button.addEventListener("click", () => callCustomer(button.dataset.callId));
  });
}

function renderRows(registrations = readRegistrations()) {
  const visible = registrations.filter(matchesFilters);
  const rows = document.querySelector("#registrationRows");
  const mobileList = document.querySelector("#mobileAdminList");
  const emptyState = document.querySelector("#emptyState");

  renderStats(registrations);

  rows.innerHTML = visible
    .map(
      (registration) => `
        <tr>
          <td>
            <strong class="confirmation">${escapeHtml(registration.confirmation)}</strong>
            <span class="cell-muted">Pass: ${escapeHtml(registration.passCode)}</span>
          </td>
          <td class="guest-cell">
            <strong>${escapeHtml(registration.fullName)}</strong>
            <span>${escapeHtml(registration.email)}</span>
            <span>${escapeHtml(registration.phone)}</span>
            ${registrationEventText(registration) ? `<span>${escapeHtml(registrationEventText(registration))}</span>` : ""}
            ${registration.gender ? `<span>${escapeHtml(registration.gender)}</span>` : ""}
          </td>
          <td>
            <strong>${renderTicketSummary(registration)}</strong>
            ${registration.notes ? `<span class="cell-muted">${escapeHtml(registration.notes)}</span>` : ""}
          </td>
          <td>${Number(registration.quantity || 0)}</td>
          <td>${formatMoney(registration.total)}</td>
          <td>
            <select class="status-select" data-status-id="${escapeHtml(registration.id)}" aria-label="Status for ${escapeHtml(registration.fullName)}">
              ${STATUS_OPTIONS.map(
                (status) => `<option value="${status}"${registration.status === status ? " selected" : ""}>${status}</option>`
              ).join("")}
            </select>
          </td>
          <td>${formatDate(registration.createdAt)}</td>
          <td>
            <div class="row-actions row-actions--stack">
              <button type="button" data-scan-id="${escapeHtml(registration.id)}">Scan guest</button>
              <button type="button" data-pdf-id="${escapeHtml(registration.id)}">PDF tickets</button>
              <button type="button" data-call-id="${escapeHtml(registration.id)}">Call</button>
              <button type="button" data-delete-id="${escapeHtml(registration.id)}" class="danger-action">Delete</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  mobileList.innerHTML = visible.length
    ? visible
        .map(
          (registration) => `
          <article class="admin-mobile-card">
            <div class="admin-card-head">
              <div>
                <strong>${escapeHtml(registration.fullName)}</strong>
                <span>${escapeHtml(registration.confirmation)} - Pass ${escapeHtml(registration.passCode)}</span>
              </div>
              <div class="admin-card-pills">
                <span class="status-pill status-pill--${escapeHtml(String(registration.status || "New").replaceAll(" ", ""))}">
                  ${escapeHtml(registration.status || "New")}
                </span>
              </div>
            </div>
            <div class="admin-card-meta">
              <span>${escapeHtml(registration.phone || "-")}</span>
              <span>${escapeHtml(registration.email || "-")}</span>
              ${registrationEventText(registration) ? `<span>${escapeHtml(registrationEventText(registration))}</span>` : ""}
              ${registration.gender ? `<span>${escapeHtml(registration.gender)}</span>` : ""}
              <span>${escapeHtml(renderTicketText(registration))}</span>
              <span>${Number(registration.quantity || 0)} tickets - ${formatMoney(registration.total)}</span>
              <span>Registered ${formatDate(registration.createdAt)}</span>
            </div>
            <div class="admin-card-controls">
              <label>
                Status
                <select class="status-select" data-status-id="${escapeHtml(registration.id)}">
                  ${STATUS_OPTIONS.map(
                    (status) => `<option value="${status}"${registration.status === status ? " selected" : ""}>${status}</option>`
                  ).join("")}
                </select>
              </label>
            </div>
            <div class="admin-card-actions">
              <button class="mobile-action mobile-action--primary" type="button" data-scan-id="${escapeHtml(registration.id)}">Scan guest</button>
              <button class="mobile-action" type="button" data-pdf-id="${escapeHtml(registration.id)}">PDF tickets</button>
              <button class="mobile-action" type="button" data-call-id="${escapeHtml(registration.id)}">Call customer</button>
              <button class="mobile-action mobile-action--danger" type="button" data-delete-id="${escapeHtml(registration.id)}">Delete</button>
            </div>
          </article>
        `
        )
        .join("")
    : `<div class="empty-state mobile-empty">No registrations match the current filters.</div>`;

  emptyState.hidden = visible.length > 0;
  bindAdminActions(rows);
  bindAdminActions(mobileList);
}

async function updateStatus(id, status) {
  await updateRegistrationStatus(id, status);
}

function firestoreRestDocumentUrl(collectionName, id) {
  const config = window.NASHAMA_FIREBASE_CONFIG;
  if (!hasValidFirebaseConfig()) return "";
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    config.projectId
  )}/databases/(default)/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}?key=${encodeURIComponent(
    config.apiKey
  )}`;
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "object") return { mapValue: { fields: encodeFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function encodeFirestoreFields(data = {}) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeFirestoreValue(value)]));
}

async function saveDocumentRest(collectionName, id, data) {
  const url = firestoreRestDocumentUrl(collectionName, id);
  if (!url) throw new Error("Firebase config is missing.");
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
  });
  if (!response.ok) throw new Error(`Could not save ${collectionName}.`);
}

async function saveDocumentWithFallback(collectionName, id, data) {
  if (!firestoreEnabled || !firestoreDb) {
    await saveDocumentRest(collectionName, id, data);
    return;
  }
  try {
    await Promise.race([
      firestoreDb.collection(collectionName).doc(id).set(data, { merge: true }),
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("Firebase write timed out")), 6000);
      }),
    ]);
  } catch {
    await saveDocumentRest(collectionName, id, data);
  }
}

async function deleteCollectionMatches(collectionName, field, value, batchSize = 150) {
  if (!firestoreEnabled || !firestoreDb) return;
  while (true) {
    const snapshot = await firestoreDb.collection(collectionName).where(field, "==", value).limit(batchSize).get();
    if (snapshot.empty) return;
    const batch = firestoreDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snapshot.size < batchSize) return;
  }
}

async function purgeCollection(collectionName, batchSize = 150) {
  if (!firestoreEnabled || !firestoreDb) return;
  while (true) {
    const snapshot = await firestoreDb.collection(collectionName).limit(batchSize).get();
    if (snapshot.empty) return;
    const batch = firestoreDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snapshot.size < batchSize) return;
  }
}

async function deleteRegistrationCascade(id) {
  if (!firestoreEnabled || !firestoreDb) {
    await deleteRegistrationById(id);
    return;
  }
  await Promise.all([
    deleteCollectionMatches(QR_COLLECTION, "registrationId", id),
    deleteCollectionMatches(SCAN_COLLECTION, "registrationId", id),
    deleteCollectionMatches(SCAN_COLLECTION, "expectedRegistrationId", id),
  ]);
  await firestoreDb.collection(FIREBASE_COLLECTION).doc(id).delete();
}

async function deleteRegistration(id) {
  const registration = readRegistrations().find((item) => item.id === id);
  if (!registration) return;
  const confirmed = window.confirm(`Delete registration ${registration.confirmation}?`);
  if (!confirmed) return;
  try {
    await deleteRegistrationCascade(id);
  } catch (error) {
    window.alert(error.message || "Could not delete this registration.");
  }
}

function buildPassPlans(registration) {
  const plans = [];
  const sourceTickets = registration.tickets?.length
    ? registration.tickets
    : [
        {
          categoryId: registration.categoryId,
          categoryName: registration.categoryName,
          quantity: registration.quantity || 1,
        },
      ];
  const ticketTotal = sourceTickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
  let ticketNumber = 1;
  sourceTickets.forEach((ticket) => {
    for (let count = 0; count < Number(ticket.quantity || 0); count += 1) {
      const categoryId = ticket.categoryId || registration.categoryId || "ticket";
      const safeCategory = categoryId.replace(/[^a-zA-Z0-9_-]/g, "");
      plans.push({
        passId: `${registration.id}_${safeCategory}_${String(ticketNumber).padStart(3, "0")}`,
        categoryId,
        categoryName: ticket.categoryName || registration.categoryName,
        ticketNumber,
        ticketTotal,
      });
      ticketNumber += 1;
    }
  });
  return plans;
}

function buildQrPayload(passId) {
  return `NASHAMA|${passId}`;
}

function extractPassIdFromQr(rawPayload) {
  const raw = String(rawPayload || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const nested = url.searchParams.get("p");
    if (nested) return extractPassIdFromQr(nested);
  } catch {}
  if (!raw.startsWith("NASHAMA|")) return null;
  return raw.split("|")[1] || null;
}

async function ensureQrPasses(registration) {
  if (!firestoreEnabled || !firestoreDb) throw new Error("Firestore is required for QR passes.");
  const plans = buildPassPlans(registration);
  const batch = firestoreDb.batch();
  const now = firebase.firestore.FieldValue.serverTimestamp();
  plans.forEach((plan) => {
    const ref = firestoreDb.collection(QR_COLLECTION).doc(plan.passId);
    batch.set(
      ref,
      {
        registrationId: registration.id,
        confirmation: registration.confirmation,
        passCode: registration.passCode,
        fullName: registration.fullName,
        phone: registration.phone,
        categoryId: plan.categoryId,
        categoryName: plan.categoryName,
        eventId: registration.eventId || "",
        eventDate: registration.eventDate || "",
        eventTime: registration.eventTime || "",
        eventTitle: registration.eventTitle || "",
        game: registration.game || "",
        teamA: registration.teamA || "",
        teamB: registration.teamB || "",
        flagA: registration.flagA || "",
        flagB: registration.flagB || "",
        ticketNumber: plan.ticketNumber,
        ticketTotal: plan.ticketTotal,
        status: "active",
        qrPayload: buildQrPayload(plan.passId),
        generatedAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  });
  batch.set(
    firestoreDb.collection(FIREBASE_COLLECTION).doc(registration.id),
    {
      generatedPassCount: plans.length,
      qrGeneratedAt: now,
      qrLastGeneratedAt: now,
    },
    { merge: true }
  );
  await batch.commit();

  const snapshot = await firestoreDb.collection(QR_COLLECTION).where("registrationId", "==", registration.id).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((pass) => plans.some((plan) => plan.passId === pass.id))
    .sort((a, b) => Number(a.ticketNumber || 0) - Number(b.ticketNumber || 0));
}

function normalizedWhatsAppPhone(phone) {
  let normalized = String(phone || "").replace(/[^\d+]/g, "");
  if (!normalized) return "";
  if (normalized.startsWith("+")) normalized = normalized.slice(1);
  if (normalized.startsWith("00")) normalized = normalized.slice(2);
  if (normalized.startsWith("9620")) normalized = `962${normalized.slice(4)}`;
  if (normalized.startsWith("962962")) normalized = normalized.slice(3);
  if (normalized.startsWith("0")) normalized = `962${normalized.slice(1)}`;
  return normalized;
}

function normalizedDialPhone(phone) {
  const normalized = normalizedWhatsAppPhone(phone);
  return normalized ? `+${normalized}` : "";
}

function callCustomer(id) {
  const registration = readRegistrations().find((item) => item.id === id);
  const phone = normalizedDialPhone(registration?.phone);
  if (phone) window.location.href = `tel:${phone}`;
}

function setActionBusy(button, busyText) {
  if (!button) return () => {};
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = busyText;
  return () => {
    button.disabled = false;
    button.textContent = originalText;
  };
}

function cleanupCurrentPdf() {
  if (currentPdf?.url) URL.revokeObjectURL(currentPdf.url);
  currentPdf = null;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not prepare the PDF preview."));
    reader.readAsDataURL(blob);
  });
}

function showPdfModal({ blob, dataUrl, file, filename, registration }) {
  cleanupCurrentPdf();
  currentPdf = {
    blob,
    dataUrl,
    file,
    filename,
    registration,
    url: URL.createObjectURL(blob),
  };

  const details = document.querySelector("#pdfModalDetails");
  details.textContent = `${registration.fullName} - ${registration.quantity || 0} tickets - ${formatMoney(
    registration.total
  )}`;
  document.querySelector("#pdfModal").hidden = false;
}

function closePdfModal() {
  document.querySelector("#pdfModal").hidden = true;
}

function openCurrentPdf(download = false) {
  if (!currentPdf) return;
  const link = document.createElement("a");
  link.href = currentPdf.dataUrl || currentPdf.url;
  link.target = "_blank";
  if (download) link.download = currentPdf.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function shareCurrentPdf() {
  if (!currentPdf) return;
  try {
    if (currentPdf.file && navigator.canShare?.({ files: [currentPdf.file] })) {
      await navigator.share({
        files: [currentPdf.file],
        title: "Nashama Arena Tickets",
        text: `Tickets for ${currentPdf.registration.fullName}`,
      });
      return;
    }
  } catch (error) {
    if (error.name === "AbortError") return;
  }
  openCurrentPdf(false);
}

function messagePdfGuest() {
  if (!currentPdf) return;
  const phone = normalizedWhatsAppPhone(currentPdf.registration.phone);
  if (!phone) return;
  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(
      "Nashama Arena PDF tickets are ready. Please attach/share the generated PDF tickets in this chat."
    )}`,
    "_blank"
  );
}

function formatDateDisplay(value) {
  if (!value) return getSiteContent().eventDate || "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `Date: ${new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)}`;
}

function dateInputValue(value) {
  const raw = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw.replace(/^Date:\s*/i, ""));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function formatTimeDisplay(value) {
  if (!value) return getSiteContent().eventTime || "";
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return `Time: ${new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)}`;
}

function timeInputValue(value) {
  const raw = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;
  const clean = raw.replace(/^Time:\s*/i, "");
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function plainLocation(value) {
  return String(value || "").replace(/^Location:\s*/i, "").trim();
}

function formatLocationDisplay(value) {
  const location = plainLocation(value) || DEFAULT_SITE_CONTENT.mapLocation;
  return `Location: ${location}`;
}

function countryLabelFromCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  const match = COUNTRY_OPTIONS.find(([countryCode]) => countryCode === normalized);
  return match ? `${match[1]} (${match[0]})` : normalized;
}

function countryNameFromCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  const match = COUNTRY_OPTIONS.find(([countryCode]) => countryCode === normalized);
  return match ? match[1] : "";
}

function countryCodeFromEventTeam(event = {}, side = "A") {
  const flagCode = parseCountryCode(event[`flag${side}`]);
  if (flagCode) return flagCode;
  return parseCountryCode(event[`team${side}`]);
}

function parseCountryCode(value) {
  const normalized = String(value || "").trim();
  const parenthesized = normalized.match(/\(([A-Za-z]{2,3})\)$/);
  if (parenthesized) return parenthesized[1].toUpperCase();
  const byCode = COUNTRY_OPTIONS.find(([code]) => code.toLowerCase() === normalized.toLowerCase());
  if (byCode) return byCode[0];
  const byName = COUNTRY_OPTIONS.find(([, name]) => name.toLowerCase() === normalized.toLowerCase());
  if (byName) return byName[0];
  return /^[A-Za-z]{2,3}$/.test(normalized) ? normalized.toUpperCase() : "";
}

function initCountryOptions() {
  const list = document.querySelector("#countryOptions");
  if (list) {
    list.innerHTML = COUNTRY_OPTIONS.map(([code, name]) => `<option value="${escapeHtml(`${name} (${code})`)}"></option>`).join("");
  }
  ["eventTeamA", "eventTeamB", "gameTeamA", "gameTeamB"].forEach((id) => {
    const select = document.querySelector(`#${id}`);
    if (!select) return;
    const currentValue = select.value;
    const label = id.endsWith("TeamA") ? "Select team A" : "Select team B";
    select.innerHTML = `<option value="">${label}</option>${COUNTRY_OPTIONS.map(
      ([code, name]) => `<option value="${escapeHtml(code)}">${escapeHtml(name)}</option>`
    ).join("")}`;
    if ([...select.options].some((option) => option.value === currentValue)) {
      select.value = currentValue;
    }
  });
  bindEventTeamSelects();
  updateEventGameFromTeams();
  updateGameGameFromTeams();
}

function selectedTeamName(selectId) {
  const select = document.querySelector(selectId);
  return select?.selectedOptions?.[0]?.textContent?.trim() || "";
}

function updateEventGameFromTeams(fallback = "") {
  const teamASelect = document.querySelector("#eventTeamA");
  const teamBSelect = document.querySelector("#eventTeamB");
  const gameInput = document.querySelector("#eventGame");
  const flagAInput = document.querySelector("#eventFlagA");
  const flagBInput = document.querySelector("#eventFlagB");
  if (!teamASelect || !teamBSelect || !gameInput) return;

  const teamA = teamASelect.value ? selectedTeamName("#eventTeamA") : "";
  const teamB = teamBSelect.value ? selectedTeamName("#eventTeamB") : "";
  if (flagAInput) flagAInput.value = teamASelect.value || "";
  if (flagBInput) flagBInput.value = teamBSelect.value || "";
  gameInput.value = teamA && teamB ? `${teamA} vs ${teamB}` : fallback;
}

function bindEventTeamSelects() {
  ["eventTeamA", "eventTeamB"].forEach((id) => {
    const select = document.querySelector(`#${id}`);
    if (!select || select.dataset.bound === "true") return;
    select.dataset.bound = "true";
    select.addEventListener("change", () => updateEventGameFromTeams());
  });
  ["gameTeamA", "gameTeamB"].forEach((id) => {
    const select = document.querySelector(`#${id}`);
    if (!select || select.dataset.bound === "true") return;
    select.dataset.bound = "true";
    select.addEventListener("change", () => updateGameGameFromTeams());
  });
}

function updateGameGameFromTeams(fallback = "") {
  const teamASelect = document.querySelector("#gameTeamA");
  const teamBSelect = document.querySelector("#gameTeamB");
  const gameInput = document.querySelector("#gameGame");
  const flagAInput = document.querySelector("#gameFlagA");
  const flagBInput = document.querySelector("#gameFlagB");
  if (!teamASelect || !teamBSelect || !gameInput) return;

  const teamA = teamASelect.value ? selectedTeamName("#gameTeamA") : "";
  const teamB = teamBSelect.value ? selectedTeamName("#gameTeamB") : "";
  if (flagAInput) flagAInput.value = teamASelect.value || "";
  if (flagBInput) flagBInput.value = teamBSelect.value || "";
  gameInput.value = teamA && teamB ? `${teamA} vs ${teamB}` : fallback;
}

async function loadImageDataUrl(src) {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Could not load ticket logo.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not prepare ticket logo."));
    reader.readAsDataURL(blob);
  });
}

async function buildTicketPdf(registration, passes) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const logoDataUrl = await loadImageDataUrl("assets/nashama-logo.jpg").catch(() => "");

  for (let index = 0; index < passes.length; index += 1) {
    const pass = passes[index];
    if (index > 0) pdf.addPage();
    const qrDataUrl = await QRCode.toDataURL(buildQrPayload(pass.id), { width: 620, margin: 1 });

    const x = 42;
    const y = 72;
    const w = pageWidth - 84;
    const h = pageHeight - 144;
    const leftW = w * 0.47;
    const detailW = w * 0.25;
    const qrW = w - leftW - detailW;

    pdf.setFillColor(242, 223, 176);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    pdf.setFillColor(55, 4, 19);
    pdf.roundedRect(x, y, w, h, 12, 12, "F");
    pdf.setDrawColor(216, 168, 62);
    pdf.setLineWidth(4);
    pdf.roundedRect(x + 12, y + 12, w - 24, h - 24, 4, 4, "S");
    pdf.setDrawColor(146, 91, 31);
    pdf.line(x + leftW, y, x + leftW, y + h);
    pdf.line(x + leftW + detailW, y, x + leftW + detailW, y + h);

    pdf.setFillColor(78, 8, 32);
    pdf.rect(x + 14, y + 14, leftW - 28, h - 28, "F");
    if (logoDataUrl) pdf.addImage(logoDataUrl, "JPEG", x + leftW / 2 - 58, y + 56, 116, 116);
    pdf.setTextColor(216, 168, 62);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(30);
    pdf.text("NASHAMA", x + leftW / 2, y + 224, { align: "center" });
    pdf.setFontSize(24);
    pdf.text("ARENA", x + leftW / 2, y + 252, { align: "center" });
    pdf.setTextColor(255, 247, 232);
    pdf.setFontSize(11);
    pdf.text("AT BIKERS VILLAGE", x + leftW / 2, y + 276, { align: "center" });

    const detailX = x + leftW + 18;
    const detailRows = [
      ["TICKET NO.", registration.confirmation],
      ["DATE", registration.eventDate || "-"],
      ["TIME", registration.eventTime || getSiteContent().eventTime.replace(/^Time:\s*/i, "")],
      ["GAME", registration.game || registration.eventTitle || "-"],
      ["ENTRY DETAILS", pass.categoryName || "General admission"],
    ];
    let detailY = y + 42;
    detailRows.forEach(([label, value]) => {
      pdf.setFillColor(242, 223, 176);
      pdf.rect(detailX, detailY, detailW - 36, 24, "F");
      pdf.setTextColor(58, 6, 23);
      pdf.setFontSize(9);
      pdf.text(label, detailX + (detailW - 36) / 2, detailY + 16, { align: "center" });
      pdf.setFillColor(90, 9, 36);
      pdf.rect(detailX, detailY + 24, detailW - 36, 38, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(value.length > 18 ? 12 : 15);
      pdf.text(String(value || "-"), detailX + (detailW - 36) / 2, detailY + 48, {
        align: "center",
        maxWidth: detailW - 48,
      });
      detailY += 72;
    });

    const qrX = x + leftW + detailW + 28;
    pdf.setDrawColor(216, 168, 62);
    pdf.setLineWidth(3);
    pdf.roundedRect(qrX, y + 56, qrW - 56, h - 112, 18, 18, "S");
    pdf.setFillColor(255, 247, 232);
    pdf.roundedRect(qrX + 22, y + 112, qrW - 100, qrW - 100, 4, 4, "F");
    pdf.addImage(qrDataUrl, "PNG", qrX + 30, y + 120, qrW - 116, qrW - 116);
    pdf.setTextColor(216, 168, 62);
    pdf.setFontSize(11);
    pdf.text(`Ticket ${pass.ticketNumber} of ${pass.ticketTotal}`, qrX + (qrW - 56) / 2, y + h - 76, { align: "center" });
    pdf.setTextColor(255, 247, 232);
    pdf.setFontSize(9);
    pdf.text("Valid for one scan only", qrX + (qrW - 56) / 2, y + h - 54, { align: "center" });
  }

  return pdf;
}

async function generateAndSharePdf(id, button = null) {
  const registration = readRegistrations().find((item) => item.id === id);
  if (!registration) return;
  const releaseButton = setActionBusy(button, "Generating...");

  try {
    if (!window.jspdf?.jsPDF || !window.QRCode) {
      throw new Error("PDF tools are still loading. Please try again in a few seconds.");
    }
    const passes = await ensureQrPasses(registration);
    if (!passes.length) throw new Error("No ticket passes were generated for this registration.");
    const pdf = await buildTicketPdf(registration, passes);
    const filename = `nashama-${registration.confirmation}.pdf`;
    const blob = pdf.output("blob");
    const file =
      typeof File === "function" ? new File([blob], filename, { type: "application/pdf" }) : null;
    const dataUrl = await blobToDataUrl(blob);
    showPdfModal({ blob, dataUrl, file, filename, registration });
  } catch (error) {
    window.alert(error.message || "Could not generate PDF tickets.");
  } finally {
    releaseButton();
  }
}

async function recordScan(result, expectedRegistrationId = "") {
  if (!firestoreEnabled || !firestoreDb) return;
  try {
    await firestoreDb.collection(SCAN_COLLECTION).add({
      ...result,
      expectedRegistrationId,
      scanner: "admin-web",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch {}
}

async function checkInQrPayload(rawPayload, expectedRegistrationId = "") {
  const passId = extractPassIdFromQr(rawPayload);
  if (!passId) {
    const result = { result: "invalid", message: "This is not a Nashama ticket QR.", rawPayload };
    await recordScan(result, expectedRegistrationId);
    return result;
  }

  try {
    const result = await firestoreDb.runTransaction(async (transaction) => {
      const passRef = firestoreDb.collection(QR_COLLECTION).doc(passId);
      const passDoc = await transaction.get(passRef);
      if (!passDoc.exists) return { result: "invalid", message: "Ticket was not found.", passId, rawPayload };
      const pass = passDoc.data();
      if (expectedRegistrationId && pass.registrationId !== expectedRegistrationId) {
        return {
          result: "invalid",
          message: "This QR belongs to another registered person.",
          passId,
          registrationId: pass.registrationId,
          fullName: pass.fullName,
          categoryName: pass.categoryName,
          rawPayload,
        };
      }
      const registrationRef = firestoreDb.collection(FIREBASE_COLLECTION).doc(pass.registrationId);
      const registrationDoc = await transaction.get(registrationRef);
      if (!registrationDoc.exists) return { result: "invalid", message: "Registration was not found.", passId, rawPayload };
      const registration = registrationDoc.data();
      if (registration.status === "Cancelled") {
        return { result: "invalid", message: "This registration is cancelled.", passId, registrationId: pass.registrationId, rawPayload };
      }
      const scannedAt = pass.scannedAt?.toDate ? pass.scannedAt.toDate() : pass.scannedAt;
      if (scannedAt) {
        return {
          result: "alreadyScanned",
          message: `Already scanned at ${formatDate(scannedAt)}`,
          passId,
          registrationId: pass.registrationId,
          fullName: pass.fullName,
          categoryName: pass.categoryName,
          previousScannedAt: scannedAt.toISOString ? scannedAt.toISOString() : String(scannedAt),
          rawPayload,
        };
      }

      const checkedInTickets = Number(registration.checkedInTickets || 0) + 1;
      const updates = {
        checkedInTickets,
        lastScannedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (Number(registration.generatedPassCount || 0) > 0 && checkedInTickets >= Number(registration.generatedPassCount || 0)) {
        updates.status = "Checked in";
      }
      transaction.update(passRef, {
        scannedAt: firebase.firestore.FieldValue.serverTimestamp(),
        scannedBy: "admin-web",
        scanStatus: "scanned",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      transaction.update(registrationRef, updates);
      return {
        result: "success",
        message: "Ticket accepted.",
        passId,
        registrationId: pass.registrationId,
        fullName: pass.fullName,
        categoryName: pass.categoryName,
        rawPayload,
      };
    });
    await recordScan(result, expectedRegistrationId);
    return result;
  } catch (error) {
    const result = { result: "error", message: error.message || String(error), passId, rawPayload };
    await recordScan(result, expectedRegistrationId);
    return result;
  }
}

async function openGuestScanner(id) {
  const registration = readRegistrations().find((item) => item.id === id);
  if (!registration) return;
  openScanner(id, registration.fullName);
  ensureQrPasses(registration).catch((error) => {
    const scanResult = document.querySelector("#scanResult");
    scanResult.className = "scan-result scan-result--error";
    scanResult.textContent = error.message || "Could not prepare this guest's QR passes.";
  });
}

function resetQrReader() {
  const reader = document.querySelector("#qrReader");
  if (reader) reader.innerHTML = "";
}

function optimizeQrReaderForMobile() {
  const applyVideoAttributes = () => {
    const video = document.querySelector("#qrReader video");
    if (!video) return false;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.muted = true;
    video.autoplay = true;
    return true;
  };

  if (applyVideoAttributes()) return;
  window.setTimeout(applyVideoAttributes, 100);
  window.setTimeout(applyVideoAttributes, 350);
}

async function startQrScanner(onScanSuccess, scanResult) {
  if (!window.Html5Qrcode) throw new Error("QR scanner tool did not load. Refresh the page and try again.");

  const config = {
    fps: 10,
    disableFlip: false,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const size = Math.max(210, Math.min(320, Math.floor(minEdge * 0.76)));
      return { width: size, height: size };
    },
  };

  const cameraTargets = [{ facingMode: "environment" }, { facingMode: { ideal: "environment" } }];
  let lastError = null;

  for (const target of cameraTargets) {
    resetQrReader();
    qrScanner = new Html5Qrcode("qrReader");
    try {
      await qrScanner.start(target, config, onScanSuccess);
      optimizeQrReaderForMobile();
      return;
    } catch (error) {
      lastError = error;
      await qrScanner.clear().catch(() => {});
      qrScanner = null;
    }
  }

  try {
    const cameras = await Html5Qrcode.getCameras();
    const backCamera =
      cameras.find((camera) => /back|rear|environment/i.test(camera.label || "")) || cameras[cameras.length - 1];
    if (backCamera?.id) {
      resetQrReader();
      qrScanner = new Html5Qrcode("qrReader");
      await qrScanner.start(backCamera.id, config, onScanSuccess);
      optimizeQrReaderForMobile();
      return;
    }
  } catch (error) {
    lastError = error;
  }

  scanResult.className = "scan-result scan-result--error";
  throw new Error(lastError?.message || "Could not open the camera. Check browser camera permission.");
}

async function openScanner(expectedRegistrationId = "", expectedName = "") {
  if (!firestoreEnabled || !firestoreDb) {
    window.alert("Firestore is required for QR scanning.");
    return;
  }
  if (qrScanner) await closeScanner(false);
  else closeScanner(false);
  scannerExpectedRegistrationId = expectedRegistrationId;
  scannerExpectedName = expectedName;
  scannerBusy = false;
  scannerStarting = true;
  document.querySelector("#scannerModal").hidden = false;
  document.querySelector("#scannerTitle").textContent = expectedName ? `Scan ${expectedName}` : "Scan ticket";
  document.querySelector("#scannerScope").textContent = expectedName
    ? "Only this registered person's QR tickets will be accepted."
    : "Any Nashama ticket QR will be accepted.";
  const scanResult = document.querySelector("#scanResult");
  scanResult.className = "scan-result";
  scanResult.textContent = "Camera is starting...";

  const onScanSuccess = async (decodedText) => {
    if (scannerBusy) return;
    scannerBusy = true;
    const result = await checkInQrPayload(decodedText, scannerExpectedRegistrationId);
    scanResult.className = `scan-result scan-result--${result.result}`;
    scanResult.textContent = `${result.message}${result.fullName ? ` ${result.fullName}` : ""}${
      result.categoryName ? ` - ${result.categoryName}` : ""
    }`;
    window.setTimeout(() => {
      scannerBusy = false;
    }, 1400);
  };

  try {
    await startQrScanner(onScanSuccess, scanResult);
    scanResult.textContent = "Camera is ready. Point it at the ticket QR.";
  } catch (error) {
    scanResult.className = "scan-result scan-result--error";
    scanResult.textContent = error.message || "Could not start the camera.";
  } finally {
    scannerStarting = false;
  }
}

async function closeScanner(hideModal = true) {
  if (hideModal?.preventDefault) hideModal.preventDefault();
  const shouldHide = hideModal !== false;
  if (shouldHide) document.querySelector("#scannerModal").hidden = true;
  scannerBusy = false;
  scannerStarting = false;
  const scanner = qrScanner;
  qrScanner = null;
  if (scanner) {
    await scanner.stop().catch(() => {});
    await scanner.clear().catch(() => {});
  }
  resetQrReader();
}

function subscribeScanRecords() {
  if (!firestoreEnabled || !firestoreDb) return;
  firestoreDb
    .collection(SCAN_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(30)
    .onSnapshot((snapshot) => {
      const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const target = document.querySelector("#scanRecords");
      if (!records.length) {
        target.textContent = "No scans recorded yet.";
        return;
      }
      target.innerHTML = records
        .map(
          (record) => `
          <article class="scan-record scan-record--${record.result}">
            <strong>${record.result}</strong>
            <span>${record.fullName || record.passId || "Unknown QR"}</span>
            <span>${record.categoryName || ""}</span>
            <small>${formatDate(record.createdAt)}</small>
            <small>${record.message || ""}</small>
          </article>
        `
        )
        .join("");
    });
}

function exportCsv() {
  const registrations = readRegistrations().filter(matchesFilters);
  const headers = [
    "confirmation",
    "passCode",
    "fullName",
    "email",
    "phone",
    "gender",
    "categoryName",
    "eventDate",
    "eventTime",
    "game",
    "teamA",
    "teamB",
    "tickets",
    "quantity",
    "price",
    "total",
    "status",
    "createdAt",
    "notes",
  ];

  const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    headers.join(","),
    ...registrations.map((registration) => headers.map((key) => escapeCsv(registration[key])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nashama-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function clearAllRegistrations() {
  const confirmed = window.confirm("Clear all registrations, QR passes, and scan records?");
  if (!confirmed) return;
  try {
    if (!firestoreEnabled || !firestoreDb) {
      await clearRegistrations();
      return;
    }
    await Promise.all([
      purgeCollection(QR_COLLECTION),
      purgeCollection(SCAN_COLLECTION),
      purgeCollection(FIREBASE_COLLECTION),
    ]);
  } catch (error) {
    window.alert(error.message || "Could not clear the admin data.");
  }
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isSafariBrowser() {
  return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(navigator.userAgent);
}

function maybeShowInstallHelp() {
  const modal = document.querySelector("#installHelpModal");
  if (!modal || !isIosDevice() || isStandaloneApp()) return;
  if (localStorage.getItem("nashamaAdminInstallHelpClosed") === "1") return;
  window.setTimeout(() => {
    modal.hidden = false;
    if (!isSafariBrowser()) {
      const intro = modal.querySelector(".install-steps p");
      intro.innerHTML = "For iPhone, copy this link and open it in <strong>Safari</strong>. Other browsers cannot install it correctly.";
    }
  }, 900);
}

function fillContentEditor() {
  const content = getSiteContent();
  document.querySelectorAll("[data-content-field]").forEach((field) => {
    const key = field.dataset.contentField;
    if (key === "eventDateValue") {
      field.value = content.eventDateValue || dateInputValue(content.eventDate);
    } else if (key === "eventTimeValue") {
      field.value = content.eventTimeValue || timeInputValue(content.eventTime);
    } else if (key === "mapLocation") {
      field.value = content.mapLocation || plainLocation(content.eventLocation);
    } else {
      field.value = content[key] ?? "";
    }
  });
}

async function saveContentSettings() {
  const content = { ...getSiteContent() };
  document.querySelectorAll("[data-content-field]").forEach((field) => {
    const key = field.dataset.contentField;
    content[key] = field.value.trim();
  });
  content.eventDate = formatDateDisplay(content.eventDateValue);
  content.eventTime = formatTimeDisplay(content.eventTimeValue);
  content.eventLocation = formatLocationDisplay(content.mapLocation);
  if (!content.mapUrl) {
    content.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.mapLocation || DEFAULT_SITE_CONTENT.mapLocation)}`;
  }
  content.mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    content.mapLocation || DEFAULT_SITE_CONTENT.mapLocation
  )}&output=embed`;
  const state = document.querySelector("#contentSaveState");
  try {
    if (!firestoreEnabled || !firestoreDb) throw new Error("Firestore needed.");
    await firestoreDb.collection(SITE_CONTENT_COLLECTION).doc(SITE_CONTENT_DOC).set(content, { merge: true });
    state.textContent = "Saved.";
  } catch (error) {
    state.textContent = error.message || "Not saved.";
  }
}

function fillTicketEditor() {
  const content = getSiteContent();
  document.querySelectorAll("[data-ticket-field]").forEach((field) => {
    const key = field.dataset.ticketField;
    field.value = content[key] ?? "";
  });
}

async function saveTicketSettings() {
  const content = {};
  document.querySelectorAll("[data-ticket-field]").forEach((field) => {
    const key = field.dataset.ticketField;
    content[key] = key === "ticketPrice" ? Number(field.value || 0) : field.value.trim();
  });
  const state = document.querySelector("#ticketSaveState");
  try {
    if (!firestoreEnabled || !firestoreDb) throw new Error("Firestore needed.");
    await firestoreDb.collection(SITE_CONTENT_COLLECTION).doc(SITE_CONTENT_DOC).set(content, { merge: true });
    state.textContent = "Saved.";
  } catch (error) {
    state.textContent = error.message || "Not saved.";
  }
}

function clearEventForm() {
  ["eventId", "eventTitle", "eventDateAdmin", "eventTimeAdmin", "eventGame", "eventTeamA", "eventFlagA", "eventTeamB", "eventFlagB", "eventPrice", "eventImage", "eventDescription"].forEach((id) => {
    const node = document.querySelector(`#${id}`);
    if (node) node.value = "";
  });
  document.querySelector("#eventActive").checked = true;
}

function clearGameForm() {
  ["gameId", "gameDateAdmin", "gameTimeAdmin", "gameGame", "gameTeamA", "gameFlagA", "gameTeamB", "gameFlagB"].forEach((id) => {
    const node = document.querySelector(`#${id}`);
    if (node) node.value = "";
  });
  editingGameGroup = "";
  document.querySelector("#gameActive").checked = true;
}

function fillGameForm(game = {}) {
  document.querySelector("#gameId").value = game.id || "";
  document.querySelector("#gameDateAdmin").value = game.date || "";
  document.querySelector("#gameTimeAdmin").value = timeInputValue(game.time) || game.time || "";
  document.querySelector("#gameTeamA").value = countryCodeFromEventTeam(game, "A");
  document.querySelector("#gameTeamB").value = countryCodeFromEventTeam(game, "B");
  editingGameGroup = game.group || "";
  updateGameGameFromTeams(game.game || "");
  document.querySelector("#gameActive").checked = game.active !== false;
}

function gameFromForm() {
  updateGameGameFromTeams();
  const date = document.querySelector("#gameDateAdmin").value;
  const game = document.querySelector("#gameGame").value.trim();
  const explicitId = document.querySelector("#gameId").value;
  const slug = (game || "game").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id =
    explicitId ||
    `${date || "game"}-${slug || "match"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    date,
    time: document.querySelector("#gameTimeAdmin").value
      ? formatTimeDisplay(document.querySelector("#gameTimeAdmin").value).replace(/^Time:\s*/i, "")
      : "",
    game,
    teamA: document.querySelector("#gameTeamA").value ? selectedTeamName("#gameTeamA") : "",
    flagA: document.querySelector("#gameTeamA").value || "",
    teamB: document.querySelector("#gameTeamB").value ? selectedTeamName("#gameTeamB") : "",
    flagB: document.querySelector("#gameTeamB").value || "",
    group: editingGameGroup,
    active: document.querySelector("#gameActive").checked,
  };
}

async function saveGameFromAdmin() {
  const game = gameFromForm();
  const state = document.querySelector("#gameSaveState");
  if (!game.date || !game.game) {
    state.textContent = "Date + teams required.";
    return;
  }
  try {
    await saveDocumentWithFallback(GAMES_COLLECTION, game.id, game);
    clearGameForm();
    state.textContent = "Saved.";
  } catch (error) {
    state.textContent = error.message || "Not saved.";
  }
}

async function deleteGame(id) {
  if (!window.confirm("Delete this game?")) return;
  await firestoreDb.collection(GAMES_COLLECTION).doc(id).delete();
}

function setGameFilterOptions(selector, values, allLabel, selectedValue) {
  const select = document.querySelector(selector);
  if (!select) return;
  const safeValues = values.filter(Boolean);
  select.innerHTML = [
    `<option value="all">${allLabel}</option>`,
    ...safeValues.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
  ].join("");
  select.value = selectedValue !== "all" && safeValues.includes(selectedValue) ? selectedValue : "all";
  if (selectedValue !== "all" && select.value === "all") {
    if (selector.includes("Date")) gameFilters.date = "all";
    if (selector.includes("Group")) gameFilters.group = "all";
  }
}

function filteredAdminGames(games) {
  const query = gameFilters.search.trim().toLowerCase();
  return games.filter((game) => {
    const searchable = [game.game, game.teamA, game.teamB, game.group, game.date, game.time]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesDate = gameFilters.date === "all" || game.date === gameFilters.date;
    const matchesGroup = gameFilters.group === "all" || game.group === gameFilters.group;
    const matchesStatus =
      gameFilters.status === "all" ||
      (gameFilters.status === "active" && game.active !== false) ||
      (gameFilters.status === "hidden" && game.active === false);
    return matchesSearch && matchesDate && matchesGroup && matchesStatus;
  });
}

function renderAdminGames() {
  const target = document.querySelector("#adminGamesList");
  if (!target) return;
  const games = adminGamesCache.length ? adminGamesCache : activeGames();
  const dates = [...new Set(games.map((game) => game.date).filter(Boolean))].sort();
  const groups = [...new Set(games.map((game) => game.group).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  setGameFilterOptions("#gameAdminDateFilter", dates, "All dates", gameFilters.date);
  setGameFilterOptions("#gameAdminGroupFilter", groups, "All groups", gameFilters.group);
  const visibleGames = filteredAdminGames(games);
  const count = document.querySelector("#adminGamesCount");
  if (count) {
    count.textContent = games.length
      ? `${visibleGames.length} of ${games.length} games shown`
      : "No games loaded yet.";
  }
  target.innerHTML = visibleGames.length
    ? visibleGames
        .map(
          (game) => `
            <article class="admin-event-row">
              <div>
                <strong>${flagEmoji(game.flagA)} ${escapeHtml(game.game || "Game")}</strong>
                <span>${escapeHtml(game.date || "")} ${escapeHtml(game.time || "")}</span>
                ${game.group ? `<span>${escapeHtml(game.group)}</span>` : ""}
                <span>${escapeHtml(game.teamA || "")} vs ${escapeHtml(game.teamB || "")}</span>
                <span>${game.active === false ? "Hidden" : "Active"}</span>
              </div>
              <button type="button" data-edit-game="${escapeHtml(game.id)}">Edit</button>
              <button type="button" data-delete-game="${escapeHtml(game.id)}" class="danger-action">Delete</button>
            </article>
          `
        )
        .join("")
    : `<p class="ticket-empty">${games.length ? "No games match these filters." : "No games yet."}</p>`;
  target.querySelectorAll("[data-edit-game]").forEach((button) => {
    button.addEventListener("click", () => fillGameForm(games.find((game) => game.id === button.dataset.editGame)));
  });
  target.querySelectorAll("[data-delete-game]").forEach((button) => {
    button.addEventListener("click", () => deleteGame(button.dataset.deleteGame));
  });
}

function fillEventForm(event = {}) {
  document.querySelector("#eventId").value = event.id || "";
  document.querySelector("#eventTitle").value = event.title || "";
  document.querySelector("#eventDateAdmin").value = event.date || "";
  document.querySelector("#eventTimeAdmin").value = timeInputValue(event.time) || event.time || "";
  document.querySelector("#eventTeamA").value = countryCodeFromEventTeam(event, "A");
  document.querySelector("#eventTeamB").value = countryCodeFromEventTeam(event, "B");
  updateEventGameFromTeams(event.game || "");
  document.querySelector("#eventPrice").value = event.price ?? "";
  document.querySelector("#eventImage").value = event.image || "";
  document.querySelector("#eventDescription").value = event.description || "";
  document.querySelector("#eventActive").checked = event.active !== false;
}

function eventFromForm() {
  const title = document.querySelector("#eventTitle").value.trim();
  const date = document.querySelector("#eventDateAdmin").value;
  updateEventGameFromTeams();
  const game = document.querySelector("#eventGame").value.trim() || title;
  const explicitId = document.querySelector("#eventId").value;
  const slug = (game || title || "match").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id =
    explicitId ||
    `${date || "event"}-${slug || "match"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    title,
    date,
    time: document.querySelector("#eventTimeAdmin").value
      ? formatTimeDisplay(document.querySelector("#eventTimeAdmin").value).replace(/^Time:\s*/i, "")
      : "",
    game,
    teamA: document.querySelector("#eventTeamA").value ? selectedTeamName("#eventTeamA") : "",
    flagA: document.querySelector("#eventTeamA").value || "",
    teamB: document.querySelector("#eventTeamB").value ? selectedTeamName("#eventTeamB") : "",
    flagB: document.querySelector("#eventTeamB").value || "",
    price: Number(document.querySelector("#eventPrice").value || getSiteContent().ticketPrice || 0),
    image: document.querySelector("#eventImage").value.trim() || "assets/match-night.jpg",
    description: document.querySelector("#eventDescription").value.trim(),
    active: document.querySelector("#eventActive").checked,
  };
}

async function saveEventFromAdmin() {
  const event = eventFromForm();
  const state = document.querySelector("#eventSaveState");
  if (!event.date || !event.game) {
    state.textContent = "Date + game required.";
    return;
  }
  try {
    await saveDocumentWithFallback(EVENTS_COLLECTION, event.id, event);
    clearEventForm();
    state.textContent = "Saved.";
  } catch (error) {
    state.textContent = error.message || "Not saved.";
  }
}

async function deleteEvent(id) {
  if (!window.confirm("Delete this event?")) return;
  await firestoreDb.collection(EVENTS_COLLECTION).doc(id).delete();
}

function renderAdminEvents() {
  const target = document.querySelector("#adminEventsList");
  if (!target) return;
  const events = adminEventsCache.length ? adminEventsCache : activeEvents();
  target.innerHTML = events.length
    ? events
        .map(
          (event) => `
            <article class="admin-event-row">
              <img src="${escapeHtml(event.image || "assets/match-night.jpg")}" alt="" />
              <div>
                <strong>${escapeHtml(event.title || event.game || "Match night")}</strong>
                <span>${escapeHtml(event.date || "")} ${escapeHtml(event.time || "")}</span>
                <span>${flagEmoji(event.flagA)} ${escapeHtml(event.teamA || "")} vs ${flagEmoji(event.flagB)} ${escapeHtml(event.teamB || "")}</span>
                <span>${formatMoney(event.price || 0)} - ${event.active === false ? "Hidden" : "Active"}</span>
              </div>
              <button type="button" data-edit-event="${escapeHtml(event.id)}">Edit</button>
              <button type="button" data-delete-event="${escapeHtml(event.id)}" class="danger-action">Delete</button>
            </article>
          `
        )
        .join("")
    : `<p class="ticket-empty">No events yet.</p>`;
  target.querySelectorAll("[data-edit-event]").forEach((button) => {
    button.addEventListener("click", () => fillEventForm(events.find((event) => event.id === button.dataset.editEvent)));
  });
  target.querySelectorAll("[data-delete-event]").forEach((button) => {
    button.addEventListener("click", () => deleteEvent(button.dataset.deleteEvent));
  });
}

function subscribeAdminContent() {
  fillContentEditor();
  fillTicketEditor();
  renderAdminGames();
  renderAdminEvents();
  if (!firestoreEnabled || !firestoreDb) return;
  firestoreDb.collection(SITE_CONTENT_COLLECTION).doc(SITE_CONTENT_DOC).onSnapshot((doc) => {
    if (doc.exists) siteContent = { ...DEFAULT_SITE_CONTENT, ...doc.data() };
    syncSingleTicketCategory();
    fillContentEditor();
    fillTicketEditor();
    populateCategorySelects();
  });
  firestoreDb.collection(EVENTS_COLLECTION).orderBy("date").onSnapshot((snapshot) => {
    adminEventsCache = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    eventsCache = adminEventsCache;
    renderAdminEvents();
  });
  firestoreDb.collection(GAMES_COLLECTION).orderBy("date").onSnapshot((snapshot) => {
    adminGamesCache = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    gamesCache = adminGamesCache;
    renderAdminGames();
  });
}

function closeInstallHelp(savePreference = true) {
  document.querySelector("#installHelpModal").hidden = true;
  if (savePreference) localStorage.setItem("nashamaAdminInstallHelpClosed", "1");
}

function initAdminPage() {
  const rows = document.querySelector("#registrationRows");
  if (!rows) return;

  initCountryOptions();
  document.querySelectorAll(".admin-quick-actions a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target instanceof HTMLDetailsElement) target.open = true;
    });
  });
  populateCategorySelects();
  const categoryFilter = document.querySelector("#categoryFilter");
  if (categoryFilter && !categoryFilter.querySelector('option[value="multiple"]')) {
    const option = document.createElement("option");
    option.value = "multiple";
    option.textContent = "Multiple categories";
    categoryFilter.appendChild(option);
  }
  document.querySelector("#searchInput").addEventListener("input", (event) => {
    filters.search = event.target.value;
    renderRows();
  });
  document.querySelector("#categoryFilter").addEventListener("change", (event) => {
    filters.category = event.target.value;
    renderRows();
  });
  document.querySelector("#statusFilter").addEventListener("change", (event) => {
    filters.status = event.target.value;
    renderRows();
  });
  document.querySelector("#gameAdminSearch").addEventListener("input", (event) => {
    gameFilters.search = event.target.value;
    renderAdminGames();
  });
  document.querySelector("#gameAdminDateFilter").addEventListener("change", (event) => {
    gameFilters.date = event.target.value;
    renderAdminGames();
  });
  document.querySelector("#gameAdminGroupFilter").addEventListener("change", (event) => {
    gameFilters.group = event.target.value;
    renderAdminGames();
  });
  document.querySelector("#gameAdminStatusFilter").addEventListener("change", (event) => {
    gameFilters.status = event.target.value;
    renderAdminGames();
  });
  document.querySelector("#exportCsv").addEventListener("click", exportCsv);
  document.querySelector("#clearAll").addEventListener("click", clearAllRegistrations);
  document.querySelector("#scanAnyQr").addEventListener("click", () => openScanner());
  document.querySelector("#closeScanner").addEventListener("click", closeScanner);
  document.querySelector("#closePdfModal").addEventListener("click", closePdfModal);
  document.querySelector("#sharePdfFile").addEventListener("click", shareCurrentPdf);
  document.querySelector("#openPdfFile").addEventListener("click", () => openCurrentPdf(false));
  document.querySelector("#downloadPdfFile").addEventListener("click", () => openCurrentPdf(true));
  document.querySelector("#messagePdfGuest").addEventListener("click", messagePdfGuest);
  document.querySelector("#closeInstallHelp").addEventListener("click", () => closeInstallHelp(true));
  document.querySelector("#installHelpDone").addEventListener("click", () => closeInstallHelp(true));
  document.querySelector("#saveContentSettings").addEventListener("click", saveContentSettings);
  document.querySelector("#saveTicketSettings").addEventListener("click", saveTicketSettings);
  document.querySelector("#saveGame").addEventListener("click", saveGameFromAdmin);
  document.querySelector("#saveEvent").addEventListener("click", saveEventFromAdmin);

  subscribeAdminContent();
  subscribeRegistrations(renderRows);
  window.setTimeout(subscribeScanRecords, 600);
  maybeShowInstallHelp();
}

document.addEventListener("DOMContentLoaded", initAdminPage);
