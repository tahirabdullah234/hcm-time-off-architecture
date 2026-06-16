# Distributed Time-Off Management Module (ExampleHR)

This project implements a high-reliability frontend integration layer with a third-party HCM API using **Next.js App Router**, **TypeScript**, **Tailwind CSS**, and **TanStack Query**.

## 🚀 How to Run the Project
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Open the dashboards:
   - Employee View: `http://localhost:3000/employee`
   - Manager View: `http://localhost:3000/manager`

## 🧪 How to Run the Automated Test Suite
To execute the integration tests verifying the optimistic update rollbacks and collision protection mechanics:
```bash
npm run test