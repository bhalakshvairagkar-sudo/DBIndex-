import { Request, Response } from 'express';
import { SavedQueriesService } from '../services/saved_queries.service.js';

const sqService = SavedQueriesService.getInstance();

export async function getSavedQueriesHandler(req: Request, res: Response): Promise<void> {
  try {
    const queries = sqService.getQueries();
    res.json({ status: 'ok', queries });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function createSavedQueryHandler(req: Request, res: Response): Promise<void> {
  const { title, sql, folder, description, isStarred, database } = req.body;
  if (!title || !sql) {
    res.status(400).json({ status: 'error', message: 'title and sql are required' });
    return;
  }
  try {
    const query = sqService.addQuery({
      title,
      sql,
      folder: folder || 'Frequently Used',
      description: description || '',
      isStarred: !!isStarred,
      database: database || 'my_database'
    });
    res.json({ status: 'ok', query });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function updateSavedQueryHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    const query = sqService.updateQuery(id, req.body);
    if (!query) {
      res.status(404).json({ status: 'error', message: 'Saved query not found' });
      return;
    }
    res.json({ status: 'ok', query });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function deleteSavedQueryHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    const deleted = sqService.deleteQuery(id);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Saved query not found' });
      return;
    }
    res.json({ status: 'ok', message: 'Query deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}
