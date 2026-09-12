// Database operations shared by the dashboard and its focused tests.
export function activityPayload(values, trip) {
  const title = String(values.title || '').trim();
  const location = String(values.location || '').trim();
  const notes = String(values.notes || '').trim();
  const date = String(values.activity_date || '');
  const time = String(values.activity_time || '');
  if (!title || title.length > 200) throw new Error('Add a title of 1–200 characters.');
  if (location.length > 300 || notes.length > 4000) throw new Error('Location or notes are too long.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < trip.start_date || date > trip.end_date || new Date(date).toISOString().slice(0,10) !== date) throw new Error('Choose a date within this trip.');
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter a valid time.');
  return {trip_id: trip.id, activity_date: date, activity_time: time || null, title, location, notes};
}
export async function saveActivity(client, payload, draft) {
  const table = client.from('travel_activities');
  const query = draft.version
    ? table.update(payload).eq('id', draft.id).eq('trip_id', payload.trip_id).eq('version', draft.version)
    : table.insert({...payload, id: draft.id});
  const {data, error} = await query.select();
  if (error) throw new Error(error.code === '23505' ? 'This activity may already have saved. Cancel and refresh to check before trying again.' : error.message);
  if (data.length !== 1) throw new Error('This activity changed in another tab. Your draft is still here; copy it, then cancel and refresh before editing again.');
  return data[0];
}
export async function deleteActivity(client, activity) {
  const {data, error} = await client.from('travel_activities').delete().eq('id', activity.id).eq('trip_id', activity.trip_id).eq('version', activity.version).select('id');
  if (error) throw new Error(error.message);
  if (data.length !== 1) throw new Error('This activity changed in another tab. Refresh before deleting it.');
}
