export interface ScamExample {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  transcript: string;
}

/**
 * Fictional calls only. No real names, phone numbers or institutions are
 * contacted. The State Farm payment in the legitimate example exists in the
 * deterministic sample ledger.
 */
export const SCAM_EXAMPLES: ScamExample[] = [
  {
    id: "bank_fraud",
    title: "Bank fraud alert",
    subtitle: "A fake Chase fraud team",
    description: "A caller claims a $2,000 card transaction and asks for a verification code.",
    transcript: `Caller: Hi, this is Daniel from Chase's fraud department. We've detected a suspicious $2,000 transaction on your Freedom Unlimited card ending in 2049. Did you authorize a purchase at Best Buy?
Customer: No, I didn't.
Caller: That's what I thought. Your account is at risk and we need to act immediately. I'm sending a six-digit verification code to your phone now. Read it back to me so I can freeze the charge.
Customer: Okay, it just arrived.
Caller: Please stay on the line and don't open the Chase app while I secure the account. Once we cancel the charge, I'll move the remaining balance to a safe account so the thieves can't access it.`,
  },
  {
    id: "government_threat",
    title: "Government threat",
    subtitle: "An IRS arrest warning",
    description: "A fake officer threatens arrest and demands payment in Apple gift cards.",
    transcript: `Caller: This is Officer Ramirez from the Internal Revenue Service. A federal warrant has been issued for your arrest because you have an unpaid tax balance of $4,850. This is your final notice before local police take action.
Customer: I don't understand. I filed my taxes.
Caller: The system says otherwise. You must resolve this today to avoid jail. Do not tell anyone about this call, including your family, or the case will be compromised.
Caller: Go to the nearest pharmacy and buy four $1,000 Apple gift cards. Then read me the card numbers and scratch off the back. This is the only way to settle the debt without a bank levy.`,
  },
  {
    id: "tech_support",
    title: "Tech support",
    subtitle: "A fake Microsoft security call",
    description: "A caller asks you to install remote access software and read a code.",
    transcript: `Caller: Hello, I'm with Microsoft Support. Our servers show that your computer has been infected with a virus that is stealing your banking passwords.
Customer: I didn't notice anything.
Caller: It's running in the background. You need to act right away. Download AnyDesk from the link I texted you and give me the nine-digit code so I can remove it.
Customer: Is this going to cost anything?
Caller: There is a one-time $299 security fee. We can also see your online banking is open, so please don't close that window. I'll need remote access to verify your accounts.`,
  },
  {
    id: "legitimate_bank",
    title: "Likely legitimate",
    subtitle: "A routine card-services call",
    description: "A calm call about a real $145 State Farm payment, with no information request.",
    transcript: `Caller: Hi, this is Morgan from Chase card services. I'm calling about a $145.00 insurance payment to State Farm that posted to your Freedom Unlimited card ending in 2049 yesterday. It looks consistent with your usual pattern, but I wanted to confirm you recognize it.
Customer: Yes, that's my monthly auto insurance.
Caller: Great, thank you. No action is needed. I won't ask for your password, verification code, or any account numbers. If you'd like to verify this call, please hang up and use the number on the back of your card or open the Chase app.
Customer: Thanks, I'll check the app.
Caller: Sounds good. Have a good day.`,
  },
];
