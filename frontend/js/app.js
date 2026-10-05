/* ============================================================
   Parrilla Vaca Bar & Grill — Reservation System
   frontend/js/app.js
   ============================================================ */

/* ---------------- API client ---------------- */
const API = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (res.status === 401) {
      if (!location.pathname.endsWith("login.html"))
        location.href = "login.html";
      return null;
    }
    const raw = await res.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: raw };
      }
    }
    if (!res.ok)
      throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
  },
  get(p) {
    return this.request(p);
  },
  post(p, b) {
    return this.request(p, { method: "POST", body: JSON.stringify(b || {}) });
  },
  put(p, b) {
    return this.request(p, { method: "PUT", body: JSON.stringify(b || {}) });
  },
  del(p) {
    return this.request(p, { method: "DELETE" });
  },
};

/* ---------------- Utilities ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const pad = (n) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const addDaysISO = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).slice(0, 10) + "T00:00:00");
  return isNaN(d)
    ? String(v)
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};
const fmtTime = (v) => {
  if (!v) return "—";
  const [h, m] = String(v).split(":").map(Number);
  if (isNaN(h)) return String(v);
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m || 0)} ${ap}`;
};
const titleCase = (v) =>
  String(v || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const relTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d)) return "";
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return fmtDate(ts);
};

const STATUS_BADGE = {
  pending: "badge--amber",
  confirmed: "badge--green",
  completed: "badge--plain",
  cancelled: "badge--red",
  no_show: "badge--red",
  open: "badge--amber",
  in_progress: "badge--gold",
  resolved: "badge--green",
};
const statusBadge = (s) =>
  `<span class="badge ${STATUS_BADGE[s] || ""}">${esc(titleCase(s))}</span>`;

/* ---------------- Toast ---------------- */
function toast(message, type = "") {
  const stack = $("#toastStack");
  if (!stack) return;
  const el = document.createElement("div");
  el.className = "toast" + (type ? ` toast--${type}` : "");
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s, transform .25s";
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    setTimeout(() => el.remove(), 260);
  }, 3400);
}

/* ---------------- Modal + form builder ---------------- */
function renderField(f) {
  const id = `f_${f.name}`;
  const full = f.full ? " field--full" : "";
  const req = f.required ? "required" : "";
  let control;
  if (f.type === "select") {
    control = `<select id="${id}" name="${f.name}" class="input" ${req}>${(
      f.options || []
    )
      .map(
        (o) =>
          `<option value="${esc(o.value)}"${String(o.value) === String(f.value ?? "") ? " selected" : ""}>${esc(o.label)}</option>`,
      )
      .join("")}</select>`;
  } else if (f.type === "textarea") {
    control = `<textarea id="${id}" name="${f.name}" class="input" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || "")}" ${req}>${esc(f.value ?? "")}</textarea>`;
  } else {
    const min = f.min != null ? `min="${f.min}"` : "";
    const max = f.max != null ? `max="${f.max}"` : "";
    control = `<input id="${id}" name="${f.name}" type="${f.type || "text"}" class="input" value="${esc(f.value ?? "")}" placeholder="${esc(f.placeholder || "")}" ${req} ${min} ${max}>`;
  }
  return `<div class="field${full}"><label for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>${control}</div>`;
}

function openForm({
  title,
  fields,
  submitLabel = "Save",
  wide = false,
  note = "",
  onSubmit,
}) {
  const root = $("#modalRoot");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal${wide ? " modal--wide" : ""}" role="dialog" aria-modal="true">
      <header class="modal__head">
        <h2>${esc(title)}</h2>
        <button type="button" class="modal__close" data-close aria-label="Close">&times;</button>
      </header>
      <form class="modal__form" novalidate>
        <div class="modal__body">
          ${note ? `<p class="form-note">${esc(note)}</p>` : ""}
          ${fields.map(renderField).join("")}
        </div>
        <footer class="modal__foot">
          <button type="button" class="btn btn--ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn--gold">${esc(submitLabel)}</button>
        </footer>
      </form>
    </div>`;
  root.appendChild(backdrop);

  const form = $("form", backdrop);
  const submitBtn = $('button[type="submit"]', backdrop);
  const close = () => {
    backdrop.style.opacity = "0";
    backdrop.style.transition = "opacity .14s";
    setTimeout(() => backdrop.remove(), 140);
  };

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.closest("[data-close]")) close();
  });
  const onKey = (e) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);

  const first = $("input, select, textarea", backdrop);
  if (first) setTimeout(() => first.focus(), 40);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = "Saving…";
    try {
      await onSubmit(values, { close, form });
      close();
    } catch (err) {
      let box = $(".form-error", form);
      if (!box) {
        box = document.createElement("p");
        box.className = "form-error";
        $(".modal__body", backdrop).appendChild(box);
      }
      box.textContent = err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });

  return { close, form };
}

function confirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  danger = true,
}) {
  return new Promise((resolve) => {
    const root = $("#modalRoot");
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal" style="max-width:420px" role="dialog" aria-modal="true">
        <header class="modal__head">
          <h2>${esc(title)}</h2>
          <button type="button" class="modal__close" data-close>&times;</button>
        </header>
        <div class="modal__body" style="grid-template-columns:1fr">
          <p style="color:var(--ink-2);font-size:13px">${esc(message)}</p>
        </div>
        <footer class="modal__foot">
          <button type="button" class="btn btn--ghost" data-close>Cancel</button>
          <button type="button" class="btn ${danger ? "btn--danger" : "btn--gold"}" data-confirm>${esc(confirmLabel)}</button>
        </footer>
      </div>`;
    root.appendChild(backdrop);
    const done = (v) => {
      backdrop.remove();
      resolve(v);
    };
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.closest("[data-close]"))
        done(false);
      if (e.target.closest("[data-confirm]")) done(true);
    });
  });
}

/* ---------------- Session + shell ---------------- */
const NAV = [
  { href: "dashboard.html", label: "Dashboard", page: "dashboard" },
  { href: "reservations.html", label: "Reservations", page: "reservations" },
  { href: "tables.html", label: "Tables", page: "tables" },
  { href: "customers.html", label: "Customers", page: "customers" },
  { href: "requests.html", label: "Requests", page: "requests" },
  { href: "reports.html", label: "Reports", page: "reports" },
];

async function requireSession() {
  try {
    const d = await API.get("/api/auth/me");
    if (!d || !d.user) {
      location.href = "login.html";
      return null;
    }
    return d.user;
  } catch {
    location.href = "login.html";
    return null;
  }
}

function renderShell(user, page) {
  const sb = $("#sidebar");
  if (!sb) return;
  sb.innerHTML = `
    <div class="brand">
      <span class="brand__mark">PV</span>
      <span class="brand__text"><strong>Parrilla Vaca</strong><em>Bar &amp; Grill</em></span>
    </div>
    <nav class="nav">
      <span class="nav__label">Operations</span>
      ${NAV.map((n) => `<a class="nav__link${n.page === page ? " is-active" : ""}" href="${n.href}">${n.label}</a>`).join("")}
    </nav>
    <div class="sidebar__foot">
      <div class="user">
        <span class="user__name">${esc(user.full_name)}</span>
        <span class="user__role">${user.role === "admin" ? "Administrator" : "Staff"}</span>
      </div>
      <button type="button" class="btn btn--ghost btn--block" id="logoutBtn">Sign out</button>
    </div>`;
  $("#logoutBtn").addEventListener("click", async () => {
    try {
      await API.post("/api/auth/logout", {});
    } catch {}
    location.href = "login.html";
  });
}

/* ---------------- Caches ---------------- */
let tablesCache = null,
  customersCache = null;
async function getTables() {
  if (!tablesCache) tablesCache = await API.get("/api/tables");
  return tablesCache;
}
async function getCustomers() {
  if (!customersCache) customersCache = await API.get("/api/customers");
  return customersCache;
}
function invalidateCaches() {
  tablesCache = null;
  customersCache = null;
}

/* ============================================================
   Page: login
   ============================================================ */
async function initLogin() {
  const form = $("#loginForm");
  const errorBox = $("#loginError");
  const btn = $('button[type="submit"]', form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";
    btn.disabled = true;
    btn.textContent = "Signing in…";
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const data = await API.post("/api/auth/login", values);
      if (data && data.user) {
        location.href = "dashboard.html";
        return;
      }
      throw new Error("Invalid credentials.");
    } catch (err) {
      errorBox.textContent = err.message;
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  });
}

/* ============================================================
   Page: dashboard
   ============================================================ */
async function initDashboard() {
  $("#todayLabel").textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const [stats, today, requests] = await Promise.all([
    API.get("/api/reservations/stats"),
    API.get("/api/reservations/today"),
    API.get("/api/requests?status=open"),
  ]);

  const s = stats || {};
  const t = s.today || {},
    tb = s.tables || {},
    rq = s.requests || {};

  $("#stats").innerHTML = [
    {
      label: "Reservations today",
      value: t.total ?? 0,
      meta: `${t.confirmed ?? 0} confirmed · ${t.pending ?? 0} pending`,
    },
    {
      label: "Guests expected",
      value: t.guests ?? 0,
      meta: "Confirmed and completed parties",
    },
    {
      label: "Tables available",
      value: `${tb.available ?? 0}/${tb.total ?? 0}`,
      meta: "Excluding inactive tables",
    },
    {
      label: "Open requests",
      value: rq.open ?? 0,
      meta: "Awaiting staff action",
    },
  ]
    .map(
      (c) => `
    <div class="stat">
      <div class="stat__label">${esc(c.label)}</div>
      <div class="stat__value">${esc(c.value)}</div>
      <div class="stat__meta">${esc(c.meta)}</div>
    </div>`,
    )
    .join("");

  const body = $("#todayBody");
  if (!today || !today.length) {
    body.innerHTML =
      '<tr><td colspan="5" class="empty">No reservations on the books for today.</td></tr>';
  } else {
    body.innerHTML = today
      .map(
        (r) => `
      <tr>
        <td><strong>${fmtTime(r.reservation_time)}</strong></td>
        <td>${esc(r.customer_name || "Guest")}</td>
        <td>${r.guest_count} pax</td>
        <td>${r.table_code ? esc(r.table_code) : '<span class="muted">Unassigned</span>'}</td>
        <td>${statusBadge(r.status)}</td>
      </tr>`,
      )
      .join("");
  }

  const feed = $("#requestFeed");
  if (!requests || !requests.length) {
    feed.innerHTML = '<li class="empty">No open requests right now.</li>';
  } else {
    feed.innerHTML = requests
      .slice(0, 6)
      .map(
        (q) => `
      <li>
        <div class="feed__body">
          <strong>${esc(q.customer_name || "Walk-in guest")}</strong>
          <span>${esc(q.details || "")}</span>
        </div>
        <span class="badge badge--gold">${esc(titleCase(q.request_type))}</span>
      </li>`,
      )
      .join("");
  }
}

/* ============================================================
   Page: reservations
   ============================================================ */
const RES_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No show" },
];

async function openReservationForm(existing) {
  const tables = await getTables();
  const customers = await getCustomers();
  const isEdit = !!existing;

  const customerOptions = [{ value: "", label: "— New customer —" }].concat(
    customers.map((c) => ({
      value: c.id,
      label: `${c.full_name}${c.phone ? " · " + c.phone : ""}`,
    })),
  );
  const tableOptions = [{ value: "", label: "Unassigned" }].concat(
    tables.map((t) => ({
      value: t.id,
      label: `${t.code} · ${t.capacity} seats${t.location ? " · " + t.location : ""}`,
    })),
  );

  const fields = [
    {
      name: "customer_id",
      label: "Existing customer",
      type: "select",
      value: existing ? existing.customer_id : "",
      options: customerOptions,
      full: true,
    },
    {
      name: "customer_name",
      label: "Guest name",
      required: true,
      value: existing ? existing.customer_name : "",
      placeholder: "Juan Dela Cruz",
    },
    {
      name: "customer_phone",
      label: "Phone",
      value: existing ? existing.customer_phone : "",
      placeholder: "09XX XXX XXXX",
    },
    {
      name: "customer_email",
      label: "Email",
      type: "email",
      value: existing ? existing.customer_email : "",
      placeholder: "guest@email.com",
      full: true,
    },
    {
      name: "reservation_date",
      label: "Date",
      type: "date",
      required: true,
      value: existing ? existing.reservation_date : todayISO(),
    },
    {
      name: "reservation_time",
      label: "Time",
      type: "time",
      required: true,
      value: existing ? existing.reservation_time : "19:00",
    },
    {
      name: "guest_count",
      label: "Party size",
      type: "number",
      min: 1,
      max: 40,
      required: true,
      value: existing ? existing.guest_count : 2,
    },
    {
      name: "table_id",
      label: "Table",
      type: "select",
      value: existing ? existing.table_id : "",
      options: tableOptions,
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      value: existing ? existing.status : "confirmed",
      options: RES_STATUSES,
    },
    {
      name: "notes",
      label: "Special requests",
      type: "textarea",
      value: existing ? existing.notes : "",
      placeholder: "Window seat, birthday setup, allergies…",
      full: true,
    },
  ];

  openForm({
    title: isEdit
      ? `Edit reservation · ${existing.customer_name}`
      : "New reservation",
    submitLabel: isEdit ? "Save changes" : "Create reservation",
    fields,
    wide: true,
    note: isEdit
      ? "Changes to date, time, or table are re-checked against other bookings."
      : "Overlapping bookings for the same table are blocked automatically.",
    onSubmit: async (v) => {
      const payload = {
        customer_id: v.customer_id ? Number(v.customer_id) : null,
        customer_name: v.customer_name.trim(),
        customer_phone: v.customer_phone.trim(),
        customer_email: v.customer_email.trim(),
        reservation_date: v.reservation_date,
        reservation_time: v.reservation_time,
        guest_count: Number(v.guest_count),
        table_id: v.table_id ? Number(v.table_id) : null,
        status: v.status,
        notes: v.notes.trim(),
      };
      if (isEdit) await API.put(`/api/reservations/${existing.id}`, payload);
      else await API.post("/api/reservations", payload);
      toast(isEdit ? "Reservation updated." : "Reservation created.", "ok");
      invalidateCaches();
      await refreshReservations();
    },
  });
}

async function refreshReservations() {
  const params = new URLSearchParams();
  const date = $("#filterDate").value;
  const status = $("#filterStatus").value;
  const q = $("#filterSearch").value.trim();
  if (date) params.set("date", date);
  if (status) params.set("status", status);
  if (q) params.set("q", q);

  const rows = await API.get(
    "/api/reservations" + (params.toString() ? "?" + params : ""),
  );
  const body = $("#resBody");
  if (!rows || !rows.length) {
    body.innerHTML =
      '<tr><td colspan="7" class="empty">No reservations match these filters.</td></tr>';
    return;
  }
  body.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${fmtDate(r.reservation_date)}</td>
      <td><strong>${fmtTime(r.reservation_time)}</strong></td>
      <td>${esc(r.customer_name || "Guest")}${r.customer_phone ? `<div class="muted" style="font-size:11.5px">${esc(r.customer_phone)}</div>` : ""}</td>
      <td>${r.guest_count} pax</td>
      <td>${r.table_code ? esc(r.table_code) : '<span class="muted">—</span>'}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <div class="actions">
          <button class="btn btn--sm btn--ghost" data-edit="${r.id}">Edit</button>
          ${["pending", "confirmed"].includes(r.status) ? `<button class="btn btn--sm btn--ghost" data-cancel="${r.id}">Cancel</button>` : ""}
          <button class="btn btn--sm btn--danger" data-delete="${r.id}">Delete</button>
        </div>
      </td>
    </tr>`,
    )
    .join("");

  $$("[data-edit]", body).forEach((btn) =>
    btn.addEventListener("click", () => {
      const record = rows.find((r) => String(r.id) === btn.dataset.edit);
      if (record) openReservationForm(record);
    }),
  );
  $$("[data-cancel]", body).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: "Cancel reservation",
        message:
          "This marks the booking as cancelled. The record is kept for reporting.",
        confirmLabel: "Cancel booking",
      });
      if (!ok) return;
      try {
        await API.put(`/api/reservations/${btn.dataset.cancel}`, {
          status: "cancelled",
        });
        toast("Reservation cancelled.", "ok");
        invalidateCaches();
        await refreshReservations();
      } catch (err) {
        toast(err.message, "err");
      }
    }),
  );
  $$("[data-delete]", body).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: "Delete reservation",
        message: "This permanently removes the record. This cannot be undone.",
      });
      if (!ok) return;
      try {
        await API.del(`/api/reservations/${btn.dataset.delete}`);
        toast("Reservation deleted.", "ok");
        invalidateCaches();
        await refreshReservations();
      } catch (err) {
        toast(err.message, "err");
      }
    }),
  );
}

async function initReservations() {
  $("#filterDate").value = todayISO();
  $("#newReservation").addEventListener("click", () =>
    openReservationForm(null),
  );
  let debounce;
  $("#filterSearch").addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(refreshReservations, 260);
  });
  $("#filterDate").addEventListener("change", refreshReservations);
  $("#filterStatus").addEventListener("change", refreshReservations);
  $("#clearFilters").addEventListener("click", () => {
    $("#filterDate").value = "";
    $("#filterStatus").value = "";
    $("#filterSearch").value = "";
    refreshReservations();
  });
  await refreshReservations();
  if (new URLSearchParams(location.search).get("new") === "1")
    openReservationForm(null);
}

/* ============================================================
   Page: tables
   ============================================================ */
function openTableForm(existing) {
  const isEdit = !!existing;
  openForm({
    title: isEdit ? `Edit table · ${existing.code}` : "Add table",
    submitLabel: isEdit ? "Save changes" : "Add table",
    fields: [
      {
        name: "code",
        label: "Table code",
        required: true,
        value: existing ? existing.code : "",
        placeholder: "T01",
      },
      {
        name: "capacity",
        label: "Capacity",
        type: "number",
        min: 1,
        max: 30,
        required: true,
        value: existing ? existing.capacity : 2,
      },
      {
        name: "location",
        label: "Location",
        value: existing ? existing.location : "",
        placeholder: "Main hall, veranda, VIP room",
        full: true,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        value: existing ? existing.status : "active",
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
        full: true,
      },
    ],
    onSubmit: async (v) => {
      const payload = {
        code: v.code.trim().toUpperCase(),
        capacity: Number(v.capacity),
        location: v.location.trim(),
        status: v.status,
      };
      if (isEdit) await API.put(`/api/tables/${existing.id}`, payload);
      else await API.post("/api/tables", payload);
      toast(isEdit ? "Table updated." : "Table added.", "ok");
      invalidateCaches();
      await refreshTables();
    },
  });
}

async function refreshTables() {
  const tables = await API.get("/api/tables");
  tablesCache = tables;
  const grid = $("#tableGrid");
  if (!tables || !tables.length) {
    grid.innerHTML = '<p class="empty">No tables configured yet.</p>';
    return;
  }

  grid.innerHTML = tables
    .map(
      (t) => `
    <article class="table-card">
      <div class="table-card__head">
        <span class="table-card__code">${esc(t.code)}</span>
        ${t.status === "inactive" ? '<span class="badge badge--red">Inactive</span>' : '<span class="badge badge--green">Active</span>'}
      </div>
      <dl>
        <div><dt>Capacity</dt><dd>${t.capacity} seats</dd></div>
        <div><dt>Location</dt><dd>${esc(t.location || "—")}</dd></div>
      </dl>
      <div class="table-card__foot">
        <button class="btn btn--sm btn--ghost" data-edit="${t.id}">Edit</button>
        <button class="btn btn--sm btn--danger" data-delete="${t.id}">Delete</button>
      </div>
    </article>`,
    )
    .join("");

  $$("[data-edit]", grid).forEach((btn) =>
    btn.addEventListener("click", () => {
      const t = tables.find((x) => String(x.id) === btn.dataset.edit);
      if (t) openTableForm(t);
    }),
  );
  $$("[data-delete]", grid).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const t = tables.find((x) => String(x.id) === btn.dataset.delete);
      const ok = await confirmDialog({
        title: `Delete table ${t ? t.code : ""}`,
        message:
          "Tables with active reservations cannot be deleted. Deactivate them instead.",
      });
      if (!ok) return;
      try {
        await API.del(`/api/tables/${btn.dataset.delete}`);
        toast("Table deleted.", "ok");
        invalidateCaches();
        await refreshTables();
      } catch (err) {
        toast(err.message, "err");
      }
    }),
  );
}

async function checkAvailability() {
  const date = $("#availDate").value;
  const time = $("#availTime").value;
  const guests = Number($("#availGuests").value || 1);
  const out = $("#availResult");
  if (!date || !time) {
    out.innerHTML = '<span class="empty">Choose a date and time.</span>';
    return;
  }
  out.innerHTML = '<span class="muted" style="font-size:12px">Checking…</span>';
  try {
    const params = new URLSearchParams({ date, time, guests });
    const list = await API.get("/api/tables/availability?" + params);
    if (!list || !list.length) {
      out.innerHTML =
        '<span class="empty">No tables match that party size.</span>';
      return;
    }
    out.innerHTML = list
      .map(
        (t) => `
      <span class="avail-chip${t.available ? "" : " avail-chip--taken"}">
        <b>${esc(t.code)}</b>
        <span class="muted">${t.capacity} seats</span>
        <span class="badge ${t.available ? "badge--green" : "badge--red"}">${t.available ? "Free" : "Booked"}</span>
      </span>`,
      )
      .join("");
  } catch (err) {
    out.innerHTML = `<span class="empty">${esc(err.message)}</span>`;
  }
}

async function initTables() {
  $("#availDate").value = todayISO();
  $("#newTable").addEventListener("click", () => openTableForm(null));
  $("#checkAvail").addEventListener("click", checkAvailability);
  await refreshTables();
}

/* ============================================================
   Page: customers
   ============================================================ */
function openCustomerForm(existing) {
  const isEdit = !!existing;
  openForm({
    title: isEdit ? `Edit customer · ${existing.full_name}` : "Add customer",
    submitLabel: isEdit ? "Save changes" : "Add customer",
    fields: [
      {
        name: "full_name",
        label: "Full name",
        required: true,
        value: existing ? existing.full_name : "",
        placeholder: "Juan Dela Cruz",
        full: true,
      },
      {
        name: "phone",
        label: "Phone",
        value: existing ? existing.phone : "",
        placeholder: "09XX XXX XXXX",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        value: existing ? existing.email : "",
        placeholder: "guest@email.com",
      },
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        value: existing ? existing.notes : "",
        placeholder: "Preferences, allergies, VIP status…",
        full: true,
      },
    ],
    onSubmit: async (v) => {
      const payload = {
        full_name: v.full_name.trim(),
        phone: v.phone.trim(),
        email: v.email.trim(),
        notes: v.notes.trim(),
      };
      if (isEdit) await API.put(`/api/customers/${existing.id}`, payload);
      else await API.post("/api/customers", payload);
      toast(isEdit ? "Customer updated." : "Customer added.", "ok");
      invalidateCaches();
      await refreshCustomers();
    },
  });
}

async function refreshCustomers() {
  const q = $("#customerSearch").value.trim();
  const rows = await API.get(
    "/api/customers" + (q ? "?q=" + encodeURIComponent(q) : ""),
  );
  customersCache = rows;
  const body = $("#customerBody");
  if (!rows || !rows.length) {
    body.innerHTML =
      '<tr><td colspan="6" class="empty">No customers found.</td></tr>';
    return;
  }
  body.innerHTML = rows
    .map(
      (c) => `
    <tr>
      <td><strong>${esc(c.full_name)}</strong></td>
      <td>${esc(c.phone || "—")}</td>
      <td>${esc(c.email || "—")}</td>
      <td>${c.visits ?? 0}</td>
      <td>${c.last_visit ? fmtDate(c.last_visit) : '<span class="muted">—</span>'}</td>
      <td>
        <div class="actions">
          <button class="btn btn--sm btn--ghost" data-edit="${c.id}">Edit</button>
          <button class="btn btn--sm btn--danger" data-delete="${c.id}">Delete</button>
        </div>
      </td>
    </tr>`,
    )
    .join("");

  $$("[data-edit]", body).forEach((btn) =>
    btn.addEventListener("click", () => {
      const c = rows.find((x) => String(x.id) === btn.dataset.edit);
      if (c) openCustomerForm(c);
    }),
  );
  $$("[data-delete]", body).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const c = rows.find((x) => String(x.id) === btn.dataset.delete);
      const ok = await confirmDialog({
        title: `Delete ${c ? c.full_name : "customer"}`,
        message: "Customers with reservations on record cannot be deleted.",
      });
      if (!ok) return;
      try {
        await API.del(`/api/customers/${btn.dataset.delete}`);
        toast("Customer deleted.", "ok");
        invalidateCaches();
        await refreshCustomers();
      } catch (err) {
        toast(err.message, "err");
      }
    }),
  );
}

async function initCustomers() {
  $("#newCustomer").addEventListener("click", () => openCustomerForm(null));
  let debounce;
  $("#customerSearch").addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(refreshCustomers, 260);
  });
  await refreshCustomers();
}

/* ============================================================
   Page: requests
   ============================================================ */
const REQUEST_TYPES = [
  { value: "table_preference", label: "Table preference" },
  { value: "dietary", label: "Dietary requirement" },
  { value: "special_occasion", label: "Special occasion" },
  { value: "service", label: "Service concern" },
  { value: "other", label: "Other" },
];
const requestTypeLabel = (v) =>
  (REQUEST_TYPES.find((t) => t.value === v) || { label: titleCase(v) }).label;

async function refreshRequests() {
  const status = $("#requestStatus").value;
  const rows = await API.get(
    "/api/requests" + (status ? "?status=" + status : ""),
  );
  const list = $("#requestList");
  if (!rows || !rows.length) {
    list.innerHTML = '<p class="empty">No requests in this view.</p>';
    return;
  }

  list.innerHTML = rows
    .map(
      (q) => `
    <article class="req req--${esc(q.status)}">
      <div class="req__body">
        <div class="req__top">
          <strong>${esc(q.customer_name || "Walk-in guest")}</strong>
          <span class="badge badge--plain">${esc(requestTypeLabel(q.request_type))}</span>
          ${statusBadge(q.status)}
        </div>
        <p class="req__details">${esc(q.details || "")}</p>
        <p class="req__meta">${q.customer_phone ? esc(q.customer_phone) + " · " : ""}Logged ${relTime(q.created_at)}${q.reservation_id ? ` · Linked to reservation #${q.reservation_id}` : ""}</p>
      </div>
      <div class="req__actions">
        ${q.status === "open" ? `<button class="btn btn--sm btn--ghost" data-progress="${q.id}">Start</button>` : ""}
        ${["open", "in_progress"].includes(q.status) ? `<button class="btn btn--sm btn--gold" data-resolve="${q.id}">Resolve</button>` : ""}
        ${q.status !== "cancelled" ? `<button class="btn btn--sm btn--danger" data-cancel="${q.id}">Cancel</button>` : ""}
        <button class="btn btn--sm btn--danger" data-delete="${q.id}">Delete</button>
      </div>
    </article>`,
    )
    .join("");

  const setStatus = async (id, next, message) => {
    try {
      await API.put(`/api/requests/${id}`, { status: next });
      toast(message, "ok");
      await refreshRequests();
    } catch (err) {
      toast(err.message, "err");
    }
  };
  $$("[data-progress]", list).forEach((b) =>
    b.addEventListener("click", () =>
      setStatus(b.dataset.progress, "in_progress", "Marked in progress."),
    ),
  );
  $$("[data-resolve]", list).forEach((b) =>
    b.addEventListener("click", () =>
      setStatus(b.dataset.resolve, "resolved", "Request resolved."),
    ),
  );
  $$("[data-cancel]", list).forEach((b) =>
    b.addEventListener("click", () =>
      setStatus(b.dataset.cancel, "cancelled", "Request cancelled."),
    ),
  );

  $$("[data-delete]", list).forEach((b) =>
    b.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: "Delete request",
        message: "This permanently removes the request from the log.",
      });
      if (!ok) return;
      try {
        await API.del(`/api/requests/${b.dataset.delete}`);
        toast("Request deleted.", "ok");
        await refreshRequests();
      } catch (err) {
        toast(err.message, "err");
      }
    }),
  );
}

async function openRequestForm() {
  const customers = await getCustomers();
  openForm({
    title: "Log guest request",
    submitLabel: "Log request",
    fields: [
      {
        name: "customer_id",
        label: "Customer",
        type: "select",
        value: "",
        options: [{ value: "", label: "— Walk-in / not on file —" }].concat(
          customers.map((c) => ({
            value: c.id,
            label: `${c.full_name}${c.phone ? " · " + c.phone : ""}`,
          })),
        ),
        full: true,
      },
      {
        name: "customer_name",
        label: "Guest name (if not on file)",
        value: "",
        placeholder: "Optional",
      },
      {
        name: "customer_phone",
        label: "Phone",
        value: "",
        placeholder: "Optional",
      },
      {
        name: "request_type",
        label: "Request type",
        type: "select",
        value: "table_preference",
        options: REQUEST_TYPES,
        full: true,
      },
      {
        name: "details",
        label: "Details",
        type: "textarea",
        required: true,
        value: "",
        placeholder: "Describe the request…",
        full: true,
      },
    ],
    onSubmit: async (v) => {
      await API.post("/api/requests", {
        customer_id: v.customer_id ? Number(v.customer_id) : null,
        customer_name: v.customer_name.trim(),
        customer_phone: v.customer_phone.trim(),
        request_type: v.request_type,
        details: v.details.trim(),
      });
      toast("Request logged.", "ok");
      await refreshRequests();
    },
  });
}

async function initRequests() {
  $("#newRequest").addEventListener("click", openRequestForm);
  $("#requestStatus").addEventListener("change", refreshRequests);
  await refreshRequests();
}

/* ============================================================
   Page: reports
   ============================================================ */
function barRow(label, value, max) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return `<div class="bar-row">
    <span class="bar-row__label">${esc(label)}</span>
    <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
    <span class="bar-row__value">${value}</span>
  </div>`;
}

async function runReport() {
  const from = $("#reportFrom").value;
  const to = $("#reportTo").value;
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const data = await API.get(
    "/api/reservations/report" + (params.toString() ? "?" + params : ""),
  );
  if (!data) return;
  const s = data.summary || {};

  $("#reportStats").innerHTML = [
    {
      label: "Reservations",
      value: s.reservations ?? 0,
      meta: `${fmtDate(from)} – ${fmtDate(to)}`,
    },
    {
      label: "Total guests",
      value: s.guests ?? 0,
      meta: `Avg party ${s.avg_party ?? 0}`,
    },
    {
      label: "Completed",
      value: s.completed ?? 0,
      meta: `${s.completion_rate ?? 0}% completion rate`,
    },
    {
      label: "Lost bookings",
      value: (s.cancelled ?? 0) + (s.no_show ?? 0),
      meta: `${s.cancelled ?? 0} cancelled · ${s.no_show ?? 0} no-show`,
    },
  ]
    .map(
      (c) => `
    <div class="stat">
      <div class="stat__label">${esc(c.label)}</div>
      <div class="stat__value">${esc(c.value)}</div>
      <div class="stat__meta">${esc(c.meta)}</div>
    </div>`,
    )
    .join("");

  const statusRows = data.by_status || [];
  const statusMax = Math.max(1, ...statusRows.map((r) => r.count));
  $("#statusBreakdown").innerHTML = statusRows.length
    ? statusRows
        .map((r) => barRow(titleCase(r.status), r.count, statusMax))
        .join("")
    : '<p class="empty">No data for this range.</p>';

  const hours = data.by_hour || [];
  const hourMax = Math.max(1, ...hours.map((r) => r.count));
  $("#peakHours").innerHTML = hours.length
    ? hours
        .map((r) => barRow(fmtTime(`${pad(r.hour)}:00`), r.count, hourMax))
        .join("")
    : '<p class="empty">No data for this range.</p>';

  const top = data.top_customers || [];
  $("#topCustomers").innerHTML = top.length
    ? top
        .map(
          (c, i) => `
      <li>
        <span class="rank-list__idx">${i + 1}</span>
        <div class="rank-list__body"><strong>${esc(c.name)}</strong><span>${c.visits} visits · ${c.guests} guests</span></div>
        <span class="rank-list__val">${c.visits}</span>
      </li>`,
        )
        .join("")
    : '<li class="empty">No repeat guests in this range.</li>';
}

async function initReports() {
  $("#reportTo").value = todayISO();
  $("#reportFrom").value = addDaysISO(todayISO(), -29);
  $("#runReport").addEventListener("click", () =>
    runReport().catch((err) => toast(err.message, "err")),
  );
  await runReport();
}

/* ============================================================
   Bootstrap — routes by <body data-page="…">
   ============================================================ */
const PAGES = {
  dashboard: initDashboard,
  reservations: initReservations,
  tables: initTables,
  customers: initCustomers,
  requests: initRequests,
  reports: initReports,
};

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  // index.html does its own redirect
  if (page === "index") {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      const data = res.ok ? await res.json() : null;
      location.replace(data && data.user ? "dashboard.html" : "login.html");
    } catch {
      location.replace("login.html");
    }
    return;
  }

  if (page === "login") {
    initLogin();
    return;
  }

  const user = await requireSession();
  if (!user) return;
  renderShell(user, page);

  const init = PAGES[page];
  if (!init) return;
  try {
    await init(user);
  } catch (err) {
    console.error(err);
    toast(err.message || "Unable to load this page.", "err");
  }
});
