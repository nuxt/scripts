const owners = new WeakSet()
const api = {
  count: 0,
  increment() {
    if (!owners.has(this))
      throw new TypeError('Illegal invocation')
    this.count++
  },
}
owners.add(api)
window.fixtureApi = api
