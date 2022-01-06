import Group from 'App/Models/Group'
import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'
import User from 'App/Models/User'

export default class GroupPolicy extends BasePolicy {
  public async update(user: User, group: Group) {
    return user.id === group.master
  }
  public async destroy(user: User, group: Group) {
    return user.id === group.master
  }
  public async removePlayer(user: User, newUser: User) {
    return user.id === newUser.id
  }
}
