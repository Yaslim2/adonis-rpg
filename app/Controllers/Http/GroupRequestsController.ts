import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequest from 'App/Exceptions/BadRequestException'
import Group from 'App/Models/Group'
import GroupRequest from 'App/Models/GroupRequest'

export default class GroupRequestsController {
  public async index({ request, response, bouncer }: HttpContextContract) {
    const { master } = request.qs()
    if (!master) throw new BadRequest('master query should be provided', 422)
    await bouncer.with('GroupRequestPolicy').authorize('view', Number(master))
    const groupRequests = await GroupRequest.query()
      .select('id', 'groupId', 'userId', 'status')
      .whereHas('group', (query) => {
        query.where('master', Number(master))
      })
      .where('status', 'PENDING')
      .preload('group', (query) => {
        query.select('name', 'master', 'id')
      })
      .preload('user', (query) => {
        query.select('username', 'id')
      })

    response.ok({ groupRequests })
  }
  public async store({ request, response, auth }: HttpContextContract) {
    const groupId = request.param('groupId') as number
    const userId = auth.user!.id

    const existingGroupRequest = await GroupRequest.query()
      .where('groupId', groupId)
      .andWhere('userId', userId)
      .first()

    if (existingGroupRequest) throw new BadRequest('group request already exists', 409)

    const userAlreadyInGroup = await Group.query()
      .whereHas('players', (query) => {
        query.where('id', userId)
      })
      .andWhere('id', groupId)
      .first()

    if (userAlreadyInGroup) throw new BadRequest('user is already in the group', 422)

    const groupRequest = await GroupRequest.create({ groupId, userId })
    await groupRequest.refresh()
    return response.created({ groupRequest })
  }

  public async accept({ request, response, bouncer }: HttpContextContract) {
    const groupId = Number(request.param('groupId'))
    const requestId = Number(request.param('requestId'))

    const groupRequest = await GroupRequest.query()
      .where('id', requestId)
      .andWhere('groupId', groupId)
      .preload('group', (query) => {
        query.select('id', 'name', 'master')
      })
      .firstOrFail()

    await bouncer.with('GroupRequestPolicy').authorize('accept', groupRequest)
    await groupRequest.group.related('players').attach([groupRequest.userId])
    const updatedGroupRequest = groupRequest.merge({ status: 'ACCEPTED' })

    return response.ok({ groupRequest: updatedGroupRequest })
  }

  public async destroy({ request, response, bouncer }: HttpContextContract) {
    const groupId = Number(request.param('groupId'))
    const requestId = Number(request.param('requestId'))
    const groupRequest = await GroupRequest.query()
      .where('id', requestId)
      .andWhere('groupId', groupId)
      .preload('group', (query) => {
        query.select('id', 'name', 'master')
      })
      .firstOrFail()

    await bouncer.with('GroupRequestPolicy').authorize('destroy', groupRequest)
    await groupRequest.delete()
    return response.noContent()
  }
}