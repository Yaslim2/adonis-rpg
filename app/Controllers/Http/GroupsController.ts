import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequest from 'App/Exceptions/BadRequestException'
import Group from 'App/Models/Group'
import CreateUser from 'App/Validators/CreateGroupValidator'

export default class GroupsController {
  public async index({ request, response }: HttpContextContract) {
    const groupId = request.param('id')
    const group = await Group.findOrFail(groupId)
    return response.ok({ group })
  }

  public async store({ request, response }: HttpContextContract) {
    const groupPayload = await request.validate(CreateUser)
    const group = await Group.create(groupPayload)
    await group.related('players').attach([groupPayload.master])
    await group.load('players')
    await group.load('masterUser')
    return response.created({ group })
  }

  public async update({ request, response, bouncer }: HttpContextContract) {
    const id = request.param('id')
    const payload = request.all()
    const group = await Group.findOrFail(id)
    await bouncer.with('GroupPolicy').authorize('update', group)

    if (payload.master) payload.master = group.master
    const updatedGroup = await group.merge(payload).save()
    return response.ok({ group: updatedGroup })
  }

  public async removePlayer({ request, response, bouncer, auth }: HttpContextContract) {
    const groupId = request.param('groupId') as number
    const playerId = +request.param('playerId') as number

    const group = await Group.findOrFail(groupId)
    if (auth.user?.id !== group.master) {
      await bouncer.with('GroupPolicy').authorize('removePlayer', auth.user!)
    }
    if (playerId === group.master) throw new BadRequest('cannot remove master from group', 400)
    await group.related('players').detach([playerId])
    return response.noContent()
  }

  public async destroy({ request, response, bouncer }: HttpContextContract) {
    const id = request.param('id')
    const group = await Group.findOrFail(id)
    await bouncer.with('GroupPolicy').authorize('destroy', group)
    await group.delete()
    return response.noContent()
  }
}
