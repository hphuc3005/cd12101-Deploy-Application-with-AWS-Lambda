import { v4 as uuidv4 } from 'uuid'
import { PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { createLogger } from '../utils/logger.mjs'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const logger = createLogger('todoModels')

const dynamoDBClient = new DynamoDBClient({});
const s3Client = new S3Client({ signatureVersion: 'v4' });

export class TodoModel {
  constructor() {
    this.tableName = process.env.TODOS_TABLE
    this.bucketName = process.env.S3_BUCKET
  }

  async getUserData(userId) {
    logger.info(`Getting userData for userId = ${userId}`)
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId }
      },
    }
    const result = await dynamoDBClient.send(new QueryCommand(params))
    if (!result?.Items) {
      logger.info('Cannot get userData', { userId: userId })
      throw new Error(`Data for userId = ${userId} is not found!`)
    }
    logger.info('Successfully get userData', { userId: userId, items: result.Items })
    return result.Items.map((item) => {
      return {
        todoId: item.todoId.S,
        userId: userId,
        attachmentUrl: item.attachmentUrl?.S,
        dueDate: item.dueDate.S,
        createdAt: item.createdAt.S,
        name: item.name.S,
        done: item.done.B,
      }
    })
  }

  async createTodo(userId, data) {
    logger.info("Creating todo data", { userId: userId, data: data })
    const itemId = uuidv4()
    const name = data?.name
    if (!name) {
      throw new Error("Todo name is required!!!")
    }
    const item = {
      todoId: itemId,
      userId: userId,
      createdAt: new Date().toISOString(),
      done: false,
      attachmentUrl: "",
      ...data
    }

    const result = await dynamoDBClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item
      })
    )
    logger.info("Created todo data", { result: result })
    return item
  }

  async updateTodo(userId, todoId, data) {
    logger.info("Updating todo data", { userId: userId, todoId: todoId, data: data })
    const name = data?.name
    if (!name) {
      throw new Error("Todo name is required!!!")
    }
    const params = {
      TableName: this.tableName,
      Key: {
        userId: userId,
        todoId: todoId,
      },
      UpdateExpression: 'set #name = :name, dueDate = :dueDate, done = :done',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': data.name,
        ':dueDate': data.dueDate,
        ':done': data.done
      },
      ReturnValues: 'UPDATED_NEW'
    }

    const result = await dynamoDBClient.send(new UpdateCommand(params))
    logger.info("Updated todo data", { result: result })
    return data
  }

  async deleteTodo(userId, todoId) {
    logger.info("Deleting todo data", { userId: userId, todoId: todoId })
    const params = {
      TableName: this.tableName,
      Key: {
        todoId: todoId,
        userId: userId
      }
    }

    const result = await dynamoDBClient.send(new DeleteCommand(params))
    logger.info("Deleted todo data", { result: result })
    return todoId
  }

  async generateAttachmentUrl(userId, todoId) {
    logger.info("Generating uploaded URL", { todoId: todoId })

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: todoId
    })

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    })

    logger.info("Generated uploaded URL", { todoId: todoId, url: url })

    const attachmentUrl = url.split("?")[0];
    const params = {
      TableName: this.tableName,
      Key: {
        userId: userId,
        todoId: todoId,
      },
      ExpressionAttributeNames: {
        '#attachmentUrl': 'attachmentUrl'
      },
      UpdateExpression: 'set #attachmentUrl = :attachmentUrl',
      ExpressionAttributeValues: {
        ':attachmentUrl': attachmentUrl,
      }
    }

    logger.info("Updating Attachment URL to dynamoDB", { todoId: todoId, attachmentUrl })
    const result = await dynamoDBClient.send(new UpdateCommand(params))
    logger.info("Updated Attachment URL to dynamoDB", { result: result })
    return url
  }
}

export const todoModel = new TodoModel()