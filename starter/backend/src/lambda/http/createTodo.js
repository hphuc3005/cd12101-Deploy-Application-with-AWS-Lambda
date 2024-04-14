import { todoModel } from '../../models/todoModel.js';
import { getUserId } from '../utils.mjs';

export async function handler(event) {
  const userId = getUserId(event);
  const newTodoData = JSON.parse(event.body)
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({ item: await todoModel.createTodo(userId, newTodoData) }, null, 2)
  }
}