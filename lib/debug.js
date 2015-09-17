export class Debug {
  constructor() {
    this.enabled = false;
    this.local = false;
  }

  withTopic(topic) {
    return (message) => {
      if (this.enabled) {
        console.log(`[${topic}] ${message}`);
      }
    }
  }
}

let debug = new Debug();
export default debug;