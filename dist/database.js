import {activityPayload, saveActivity, deleteActivity} from './travel-data.mjs';

const $ = selector => document.querySelector(selector);
const tripId = document.body.dataset.trip.toLowerCase();
const detail = $('#day-detail');
const authPanel = $('#travel-account');
const status = $('#account-status');
const loginForm = $('#login-form');
const signout = $('#sign-out');
const sectionHosts = [...document.querySelectorAll('[data-database-section]')];
let client, session, trip, activities = [], generation = 0, selectedDate = document.body.dataset.start;
let ready = false, draftOpen = false, busy = false;
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
function button(text, action, parent) {
  const b = node('button', text, 'travel-button'); b.type = 'button'; b.onclick = action;
  parent.append(b); return b;
}
function announce(text, isError = false) { status.textContent = text; status.classList.toggle('save-error', isError); }
function clearPrivate(message) {
  ready = false; trip = null; activities = []; draftOpen = false;
  for (const host of sectionHosts) host.replaceChildren(node('p', message, 'empty-caption'));
  renderDay(message);
}
function dateHeading() {
  const date = new Date(selectedDate + 'T00:00:00Z');
  const title = node('div', undefined, 'day-title');
  title.append(node('h3', date.toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',timeZone:'UTC'})));
  return title;
}
function renderDay(message) {
  detail.replaceChildren(dateHeading());
  if (!ready) { detail.append(node('p', message || 'Sign in to view and edit your saved itinerary.', 'empty-caption')); return; }
  const toolbar = node('div', undefined, 'travel-actions');
  button('+ Add activity', () => editActivity(), toolbar);
  button('Refresh', () => loadData(), toolbar);
  detail.append(toolbar);
  const list = node('div', undefined, 'activity-list');
  const todays = activities.filter(a => a.activity_date === selectedDate);
  if (!todays.length) list.append(node('p', 'No activities planned yet. Add your first idea for this day.', 'empty-caption'));
  for (const activity of todays) {
    const card = node('article', undefined, 'activity-card');
    if (activity.activity_time) card.append(node('small', activity.activity_time.slice(0,5) + ' · Local time'));
    card.append(node('h3', activity.title));
    if (activity.location) card.append(node('p', activity.location, 'activity-location'));
    if (activity.notes) card.append(node('p', activity.notes, 'activity-notes'));
    const actions = node('div', undefined, 'travel-actions');
    button('Edit', () => editActivity(activity), actions);
    const remove = async event => {
      if (busy) return;
      busy = true; event.currentTarget.disabled = true;
      const current = generation;
      try {
        await deleteActivity(client, activity);
        if (current !== generation) return;
        activities = activities.filter(a => a.id !== activity.id); renderDay(); announce('Activity deleted.');
      } catch (error) { if (current === generation) {announce(error.message, true); renderDay();} }
      finally { busy = false; }
    };
    button('Delete', () => {
      if (busy) return;
      actions.replaceChildren(node('span', 'Delete this activity?'));
      button('Confirm delete', remove, actions);
      button('Keep activity', renderDay, actions);
    }, actions);
    card.append(actions); list.append(card);
  }
  detail.append(list);
}
function editActivity(existing) {
  if (busy || draftOpen) return;
  draftOpen = true;
  const draft = existing || {id: crypto.randomUUID(), activity_date: selectedDate};
  const form = node('form', undefined, 'activity-form');
  form.append(node('h3', existing ? 'Edit activity' : 'New activity'));
  for (const [name, label, type, limit] of [
    ['title','Activity','text',200], ['activity_date','Date','date'],
    ['activity_time','Time (local, optional)','time'], ['location','Location (optional)','text',300],
    ['notes','Notes (optional)','textarea',4000]
  ]) {
    const wrapper = node('label', label);
    const input = node(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type;
    input.name = name; input.value = draft[name]?.slice?.(0, name === 'activity_time' ? 5 : undefined) || '';
    if (limit) input.maxLength = limit;
    if (name === 'title' || name === 'activity_date') input.required = true;
    if (name === 'activity_date') {input.min = trip.start_date; input.max = trip.end_date;}
    wrapper.append(input); form.append(wrapper);
  }
  const feedback = node('p', '', 'form-feedback'); feedback.setAttribute('role','status');
  const actions = node('div', undefined, 'travel-actions');
  const save = node('button', 'Save activity', 'travel-button primary'); save.type = 'submit'; actions.append(save);
  button('Cancel', () => {if (!busy) {draftOpen = false; renderDay();}}, actions);
  form.append(feedback, actions);
  detail.replaceChildren(dateHeading(), form);
  form.elements.title.focus();
  form.onsubmit = async event => {
    event.preventDefault(); if (busy) return;
    let payload;
    try { payload = activityPayload(Object.fromEntries(new FormData(form)), trip); }
    catch (error) {feedback.textContent = error.message; return;}
    busy = true; const current = generation;
    [...form.elements].forEach(e => e.disabled = true); feedback.textContent = 'Saving…';
    try {
      const saved = await saveActivity(client, payload, draft);
      if (current !== generation) return;
      activities = activities.filter(a => a.id !== saved.id).concat(saved).sort(sortActivities);
      selectedDate = saved.activity_date; draftOpen = false; busy = false;
      const tabs = [...document.querySelectorAll('.day-strip button')];
      tabs[Math.round((new Date(selectedDate) - new Date(trip.start_date))/86400000)]?.click();
      renderDay(); announce('Saved to your travel plans.');
    } catch (error) {if (current === generation) feedback.textContent = 'Could not confirm the save. ' + error.message;}
    finally {busy = false; [...form.elements].forEach(e => e.disabled = false);}
  };
}
const sortActivities = (a,b) => a.activity_date.localeCompare(b.activity_date) || (a.activity_time || '99').localeCompare(b.activity_time || '99') || a.created_at.localeCompare(b.created_at);
function renderSections(rows) {
  const map = Object.fromEntries(rows.map(row => [row.section, row.data]));
  for (const host of sectionHosts) {
    const section = host.dataset.databaseSection, data = map[section];
    host.replaceChildren();
    if (data == null) {host.append(node('p','No saved details yet.','empty-caption')); continue;}
    if (section === 'participants') {
      const groups = node('div', undefined, 'participant-groups');
      for (const [label, names] of Object.entries(data)) {
        const group = node('section'); group.append(node('h3', label, 'participant-status ' + label.toLowerCase().replaceAll(' ','-')));
        const list = node('ul', undefined, 'participant-list');
        for (const name of names) list.append(node('li', name));
        group.append(list); groups.append(group);
      }
      host.append(groups);
    } else if (section === 'accommodations') {
      if (!data.length) host.append(node('p', 'No accommodations saved yet.', 'empty-caption'));
      for (const stay of data) {
        const card = node('article', undefined, 'activity-card');
        card.append(node('h3', stay.name || 'Accommodation'), node('p', stay.location || ''), node('p', [stay.check_in, stay.check_out].filter(Boolean).join(' → ')), node('p', stay.notes || ''));
        host.append(card);
      }
    } else if (section === 'pws') {
      const grid = node('div', undefined, 'pws-grid');
      const arrangements = node('section'); arrangements.append(node('h3','Shoot arrangements'));
      const dl = node('dl', undefined, 'pws-details');
      for (const [label, value] of Object.entries(data.arrangements || {})) {
        const row = node('div'); row.append(node('dt',label),node('dd',value)); dl.append(row);
      }
      arrangements.append(dl);
      const preparation = node('section'); preparation.append(node('h3','Preparation list'));
      const tasks = node('ul',undefined,'pws-tasks');
      for (const task of data.tasks || []) {const li=node('li'); li.append(node('span',task),node('span','To do','pws-status'));tasks.append(li);}
      preparation.append(tasks);grid.append(arrangements,preparation);
      const notes=node('div',undefined,'pws-notes');notes.append(node('h3','Ideas & references'),node('p',data.notes || 'No references added yet.'));
      host.append(grid,notes);
    }
  }
}
async function loadData() {
  if (!session || draftOpen || busy) return;
  const current = ++generation;
  clearPrivate('Loading your saved plans…');
  try {
    const results = await Promise.all([
      client.from('travel_trips').select('*').eq('id',tripId).maybeSingle(),
      client.from('travel_sections').select('section,data').eq('trip_id',tripId),
      client.from('travel_activities').select('*').eq('trip_id',tripId)
    ]);
    if (current !== generation) return;
    for (const result of results) if (result.error) throw result.error;
    if (!results[0].data) throw new Error('This account does not have access to these travel plans.');
    trip = results[0].data; activities = results[2].data.sort(sortActivities); ready = true;
    renderSections(results[1].data); renderDay(); announce('Signed in as ' + session.user.email + ' · Plans loaded');
  } catch (error) {
    if (current !== generation) return;
    clearPrivate('Could not load saved plans. Use Retry to try again.'); announce(error.message, true);
    button('Retry', loadData, detail);
  }
}
function onSession(next) {
  if (session?.user.id === next?.user.id && session && next) {session = next;return;}
  generation++; session = next; loginForm.hidden = Boolean(next); signout.hidden = !next;
  clearPrivate('Sign in to view and edit your saved plans.');
  if (next) loadData(); else announce('Sign in with your approved email to view and edit saved plans.');
}
loginForm.onsubmit = async event => {
  event.preventDefault(); const submit = loginForm.querySelector('button'); submit.disabled = true;
  const email = loginForm.elements.email.value.trim().toLowerCase();
  try {
    const {error} = await client.auth.signInWithOtp({email, options:{emailRedirectTo: location.origin + location.pathname}});
    if (error) throw error;
    announce('Check your email and open the sign-in link on this computer. Keep your local website server running.');
  } catch (error) { announce('Could not send a sign-in link: ' + error.message, true); }
  finally {submit.disabled = false;}
};
signout.onclick = async () => {
  if (busy || (draftOpen && !confirm('Discard this unsaved activity and sign out?'))) return;
  const {error} = await client.auth.signOut({scope:'local'});
  if (error) announce('Could not sign out: ' + error.message, true);
};
// The existing day tabs remain the navigation source.
document.addEventListener('travel-day-change', event => { selectedDate = event.detail.date; draftOpen = false; renderDay(); });
document.querySelector('.day-strip').addEventListener('click', event => {
  if (event.target.closest('button') && (busy || (draftOpen && !confirm('Discard this unsaved activity and change day?')))) { event.preventDefault(); event.stopImmediatePropagation(); }
}, true);
document.querySelector('.day-strip').addEventListener('keydown', event => {
  if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key) && (busy || (draftOpen && !confirm('Discard this unsaved activity and change day?')))) {event.preventDefault();event.stopImmediatePropagation();}
}, true);
window.addEventListener('beforeunload', event => {if (draftOpen || busy) {event.preventDefault();event.returnValue='';}});
window.addEventListener('focus', () => {if (session && !draftOpen && !busy) loadData();});
clearPrivate('Sign in to view and edit your saved plans.');
try {
  if (!window.supabase || !window.TRAVEL_DATABASE) throw new Error('Database connection could not load. Check your connection and reload.');
  client = window.supabase.createClient(window.TRAVEL_DATABASE.url, window.TRAVEL_DATABASE.publishableKey);
  client.auth.onAuthStateChange((_event, next) => {setTimeout(() => onSession(next), 0);});
  const {data, error} = await client.auth.getSession();
  if (error) throw error;
  onSession(data.session);
} catch (error) {
  announce(error.message, true); authPanel.querySelectorAll('button').forEach(b => b.disabled = true);
}
