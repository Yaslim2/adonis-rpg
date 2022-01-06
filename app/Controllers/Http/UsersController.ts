import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequest from 'App/Exceptions/BadRequestException'
import User from 'App/Models/User'
import CreateUser from 'App/Validators/CreateUserValidator'
import UpdateUser from 'App/Validators/UpdateUserValidator'

export default class UsersController {
  public async index({ request, response, bouncer }: HttpContextContract) {
    const id = request.param('id')
    const user = await User.findOrFail(id)
    await bouncer.with('UserPolicy').authorize('view', user)
    return response.ok({ user })
  }

  public async store({ request, response }: HttpContextContract) {
    const userPayload = await request.validate(CreateUser)

    const userByUsername = await User.findBy('username', userPayload.username)
    if (userByUsername) {
      throw new BadRequest('Username already in use', 409)
    }

    const userByEmail = await User.findBy('email', userPayload.email)
    if (userByEmail) {
      throw new BadRequest('Email already in use', 409)
    }

    const user = await User.create(userPayload)
    return response.created({ user })
  }

  public async update({ request, response, bouncer }: HttpContextContract) {
    const { email, password, avatar } = await request.validate(UpdateUser)
    const id = request.param('id')

    const user = await User.findOrFail(id)
    await bouncer.with('UserPolicy').authorize('update', user)

    if (avatar) {
      user.avatar = avatar
    }
    user.email = email
    user.password = password
    await user.save()
    return response.ok({ user })
  }
}
