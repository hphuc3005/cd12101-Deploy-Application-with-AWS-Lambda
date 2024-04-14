import { todoModel } from '../../models/todoModel.js';
import { getUserId } from '../utils.mjs';

export async function handler(event) {
  const userId = getUserId(event);
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({ items: await todoModel.getUserData(userId) }, null, 2
    )
  }
}
