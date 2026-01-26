class Storage {
  constructor() {
    this.baseUrl = '/api';
  }

  async get() {
    try {
      const response = await fetch(`${this.baseUrl}/data`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading data:', error);
      return { therapists: [] };
    }
  }

  async set(data) {
    try {
      const response = await fetch(`${this.baseUrl}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Error saving data:', error);
      return { success: false };
    }
  }
}

const storage = new Storage();