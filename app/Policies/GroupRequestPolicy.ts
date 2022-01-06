import GroupRequest from 'App/Models/GroupRequest'
import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'
import User from 'App/Models/User'

export default class GroupRequestPolicy extends BasePolicy {
  public async view(user: User, masterId: number) {
    return user.id === masterId
  }

  public async accept(user: User, groupRequest: GroupRequest) {
    return user.id === groupRequest.group.master
  }

  public async destroy(user: User, groupRequest: GroupRequest) {
    return user.id === groupRequest.group.master
  }
}
