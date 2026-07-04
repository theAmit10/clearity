import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import DocumentPicker from 'react-native-document-picker';
import { ExportPayload, Habit, LogEntry } from '../types/habit';
import { logEvent } from './logger';

const EXPORT_FILENAME = 'habit-tracker-backup.json';
const LOGS_EXPORT_FILENAME = 'habit-tracker-logs.json';

// Writes a JSON backup to a temp file and opens the native share sheet
// (AirDrop / Nearby Share / email / messaging / save to files — whatever
// the user picks). This is how data moves between devices with zero backend.
export async function exportHabits(habits: Habit[]): Promise<void> {
  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
  };
  const path = `${RNFS.CachesDirectoryPath}/${EXPORT_FILENAME}`;
  try {
    await RNFS.writeFile(path, JSON.stringify(payload, null, 2), 'utf8');
    await Share.open({
      url: `file://${path}`,
      type: 'application/json',
      failOnCancel: false,
    });
    logEvent('info', 'Habits exported', { count: habits.length });
  } catch (err) {
    logEvent('error', 'Export failed', err);
    throw err;
  }
}

export async function exportLogs(logs: LogEntry[]): Promise<void> {
  const path = `${RNFS.CachesDirectoryPath}/${LOGS_EXPORT_FILENAME}`;
  try {
    await RNFS.writeFile(path, JSON.stringify(logs, null, 2), 'utf8');
    await Share.open({
      url: `file://${path}`,
      type: 'application/json',
      failOnCancel: false,
    });
  } catch (err) {
    logEvent('error', 'Log export failed', err);
    throw err;
  }
}

// Opens the native file picker, reads the selected JSON file, and validates
// it looks like a backup produced by this app before handing it back.
export async function pickAndParseImportFile(): Promise<ExportPayload> {
  const res = await DocumentPicker.pickSingle({
    type: [DocumentPicker.types.allFiles],
    copyTo: 'cachesDirectory',
  });

  const filePath = res.fileCopyUri ?? res.uri;
  const raw = await RNFS.readFile(filePath.replace('file://', ''), 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed || !Array.isArray(parsed.habits)) {
    throw new Error('Selected file is not a valid Habit Tracker backup.');
  }
  logEvent('info', 'Import file parsed', { count: parsed.habits.length });
  return parsed as ExportPayload;
}
