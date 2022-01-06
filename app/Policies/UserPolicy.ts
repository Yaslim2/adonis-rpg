import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'
import User from 'App/Models/User'

export default class UserPolicy extends BasePolicy {
  public async view(user: User, userPolicy: User) {
    return user.id === userPolicy.id
  }
  public async update(user: User, userPolicy: User) {
    return user.id === userPolicy.id
  }
}
