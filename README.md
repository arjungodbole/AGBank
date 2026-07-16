AG Bank — Poker Chip Vision + Banking Platform

Live demo: agbank.vercel.app 

<a name="introduction">Introduction</a>

AG Bank started as a full-stack financial platform and grew into something more interesting: it lets a poker group scan a table of physical chips with a camera and automatically tally each player's stack using computer vision, on top of a banking-style account and transaction system. The part I'm most proud of is the computer-vision chip scanner (/cv-server) — a Python OpenCV service I built from scratch that detects, counts, and classifies poker chips from both a live camera feed and uploaded photos.

<a name="cv-scanner">Computer Vision: Poker Chip Scanner</a>

The cv-server is a Python service that turns a photo (or live camera frame) of a poker table into a per-player chip count.


Chip detection — uses OpenCV Hough Circle Transform to locate circular chips in the frame, since chips are round regardless of color or value
Denomination classification — converts each detected chip to HSV color space (chosen over RGB because HSV separates hue from brightness, making color classification far more robust to lighting variation) and classifies it into one of [N] denominations by color
Tallying — sums the classified chips into a running total per player
Two input paths — works on both static uploaded images (single pass) and a live camera feed (per-frame processing)
Architecture — the CV logic runs as a standalone Python microservice, exposed over [REST/HTTP] and called by the Next.js/TypeScript frontend, keeping the vision workload separate from the web app


<a name="tech-stack">Tech Stack</a>


Next.js
TypeScript
Python
OpenCV
Plaid
Dwolla
React Hook Form
Zod
TailwindCSS
Chart.js
ShadCN
Sentry


<a name="features">Features</a>

👉 Poker Chip Scanner: Scan a table of physical chips with a camera and automatically tally each player's stack using OpenCV

👉 Authentication: Secure SSR authentication with proper validations and authorization

👉 Connect Banks: Integrates with Plaid for multiple bank account linking

👉 Home Page: Shows general overview of user account with total balance from all connected banks, recent transactions, money spent on different categories, etc

👉 My Banks: Check the complete list of all connected banks with respective balances, account details

👉 Transaction History: Includes pagination and filtering options for viewing transaction history of different banks

👉 Real-time Updates: Reflects changes across all relevant pages upon connecting new bank accounts

👉 Funds Transfer: Allows users to transfer funds using Dwolla to other accounts with required fields and recipient bank ID

👉 Error Monitoring: Integrated Sentry for production error tracking


Add a .env with your Plaid, and Dwolla credentials (see .env.example).

<a name="notes">Notes</a>

The banking foundation was built following a full-stack tutorial to learn SSR auth and third-party financial API integration; the computer-vision chip scanner and its integration are my own original work.
