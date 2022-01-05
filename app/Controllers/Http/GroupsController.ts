import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Group from 'App/Models/Group'
import CreateUser from 'App/Validators/CreateGroupValidator'

export default class GroupsController {
  public async store({ request, response }: HttpContextContract) {
    const groupPayload = await request.validate(CreateUser)
    const group = await Group.create(groupPayload)
    await group.related('players').attach([groupPayload.master])
    await group.load('players')
    await group.load('masterUser')
    return response.created({ group })
  }
}
