# Dentalink Scraping Script

This project is a web scraping tool designed to assist in migrating patient data from the Dentalink management software. It extracts data from approximately 800-900 patients, simplifying the migration process to a new software system.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14.x or higher)
- [npm](https://www.npmjs.com/)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AgustinChavero/scraping-challenge.git
   ```
2. Install dependencies:

   ```bash
   npm i
   ```

3. Create a .env file in the root directory and add the following variables:

   ```bash
   DENTALINK_URL=https://fmsclinic.dentalink.cl
   USER_NAME=<your_username>
   USER_PASSWORD=<your_password>
   ```

#### Note: You need valid credentials to access the Dentalink platform. The scraping process will not work unless the credentials are provided.

3. Run the script with the following command:

   ```bash
   node scrap.js
   ```
