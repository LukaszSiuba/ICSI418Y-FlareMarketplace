# Flare: Tabletop Game Single-Card Marketplace
This is how you run and set up our marketpalce application after cloning the repository. We utilize React + Vite which makes running our application a lot easier.

Make sure, you have the following installed
**node.js and npm**
To download Node: https://nodejs.org/en/download

This will install both node.js and npm

To verify that the installation was correct run:
```bash
node -v
npm -v
```

## How to Run
1. Clone The Repository 
```bash
git clone https://github.com/LukaszSiuba/ICSI418Y-FlareMarketplace.git
cd .\ICSI418Y-FlareMarketplace\
```
2. Install the dependencies while inside ICSI418Y-FlareMarketplace :
    ```bash
    npm install
3. Start the development server:
    ```bash
    npm run dev
    ```
4. After you execute the above, you will see VITE v7.3.2 
Local: http://localhost:5173/

Enter the url: http://localhost:5173/ into your browser. Then you will see our application

## NOTES 
For Regular Buyer and Seller previews, you may create a new user or enter these credentials

Buyer Account
Email: Buyer@Flare.com
Password: BuyerAccount

Seller Account
Email: Seller@Flare.com
Password: SellerAccount

For the Admin Preview please enter this, a new admin redirect in pink will be in the navbar

Admin Account
Email: Admin@Flare.com
Password: AdminAccount

For the Support Preview please enter this, a new support redirect in blue will be in the navbar


Support Account
Email: Support@Flare.com
Password: SupportAccount

### Additional Implementations
For the forget password implementation under login, make sure to enter your valid email if you use your personal account. Only three emails are allowed per hour.