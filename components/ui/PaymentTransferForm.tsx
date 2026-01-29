"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { createTransfer } from "@/lib/actions/dwolla.actions";
import { getBank, getBankByAccountId } from "@/lib/actions/user.actions";
import { decryptId } from "@/lib/utils";

import { BankDropdown } from "./BankDropdown";
import { Button } from "./button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { createTransaction } from "@/lib/actions/transaction.actions";

// Combined schema - mode-specific validation happens in submit handler
const formSchema = z.object({
  name: z.string().min(4, "Transfer note is too short"),
  amount: z.string().min(1, "Amount is required"),
  senderBank: z.string().min(4, "Please select a valid bank account"),
  receiverBank: z.string().optional(),
  email: z.string().optional(),
  sharableId: z.string().optional(),
});

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [transferMode, setTransferMode] = useState<"own" | "other">("own");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amount: "",
      senderBank: "",
      receiverBank: "",
      email: "",
      sharableId: "",
    },
  });

  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      // Mode-specific validation
      if (transferMode === "own") {
        if (!data.receiverBank || data.receiverBank.length < 4) {
          alert("Please select a destination account.");
          setIsLoading(false);
          return;
        }
        // Check if sender and receiver are the same (using unique account.id)
        if (data.senderBank === data.receiverBank) {
          alert("Cannot transfer to the same account. Please select different accounts.");
          setIsLoading(false);
          return;
        }
      } else {
        if (!data.email || !data.email.includes("@")) {
          alert("Please enter a valid email address.");
          setIsLoading(false);
          return;
        }
        if (!data.sharableId || data.sharableId.length < 8) {
          alert("Please enter a valid sharable ID.");
          setIsLoading(false);
          return;
        }
      }

      // Find the sender account from the accounts array (data.senderBank is account.id)
      const senderAccount = accounts.find((acc: Account) => acc.id === data.senderBank);
      if (!senderAccount) {
        alert("Source account not found. Please try again.");
        setIsLoading(false);
        return;
      }

      // Get the bank record using appwriteItemId
      const senderBank = await getBank({ documentId: senderAccount.appwriteItemId });
      let receiverBank;

      if (transferMode === "own") {
        // Find the receiver account from the accounts array
        const receiverAccount = accounts.find((acc: Account) => acc.id === data.receiverBank);
        if (!receiverAccount) {
          alert("Destination account not found. Please try again.");
          setIsLoading(false);
          return;
        }
        receiverBank = await getBank({ documentId: receiverAccount.appwriteItemId });
      } else {
        // Transfer to someone else's account
        const receiverAccountId = decryptId(data.sharableId!);
        receiverBank = await getBankByAccountId({ accountId: receiverAccountId });
      }

      // Check if both banks were found
      if (!senderBank) {
        alert("Source account not found. Please try again.");
        setIsLoading(false);
        return;
      }

      if (!receiverBank) {
        alert(transferMode === "own"
          ? "Destination account not found. Please try again."
          : "Receiver bank not found. Please check the shareable ID.");
        setIsLoading(false);
        return;
      }

      // Check if sender and receiver are the same (for other mode)
      if (transferMode === "other" && senderBank.$id === receiverBank.$id) {
        alert("Cannot transfer to the same account.");
        setIsLoading(false);
        return;
      }

      // Check if banks have valid Dwolla funding sources
      if (!senderBank.fundingSourceUrl) {
        alert("Source account is not properly linked. Please reconnect your bank account.");
        setIsLoading(false);
        return;
      }

      if (!receiverBank.fundingSourceUrl) {
        alert(transferMode === "own"
          ? "Destination account is not properly linked. Please reconnect your bank account."
          : "Receiver's bank account is not properly linked to Dwolla.");
        setIsLoading(false);
        return;
      }

      // Check if both accounts have the same funding source (can't transfer to same source)
      if (senderBank.fundingSourceUrl === receiverBank.fundingSourceUrl) {
        alert("Cannot transfer between accounts with the same funding source. These accounts share the same bank connection in Dwolla.");
        setIsLoading(false);
        return;
      }

      console.log("Transfer details:", {
        source: senderBank.fundingSourceUrl,
        destination: receiverBank.fundingSourceUrl,
        amount: data.amount,
      });

      const transferParams = {
        sourceFundingSourceUrl: senderBank.fundingSourceUrl,
        destinationFundingSourceUrl: receiverBank.fundingSourceUrl,
        amount: data.amount,
      };

      // create transfer
      const transfer = await createTransfer(transferParams);

      if (!transfer) {
        alert("Transfer failed. Please check your account details and try again.");
        setIsLoading(false);
        return;
      }

      // create transfer transaction
      // Note: recieverId/recieverBankId are intentionally misspelled to match Appwrite schema
      const transaction = {
        name: data.name,
        amount: data.amount,
        senderId:
          typeof senderBank.userId === "string"
            ? senderBank.userId
            : senderBank.userId.$id,
        senderBankId: senderBank.$id,
        recieverId:
          typeof receiverBank.userId === "string"
            ? receiverBank.userId
            : receiverBank.userId.$id,
        recieverBankId: receiverBank.$id,
        email: data.email || "",
      };

      const newTransaction = await createTransaction(transaction);

      if (newTransaction) {
        form.reset();
        router.push("/reports");
      } else {
        alert("Transfer completed but failed to save transaction record.");
        form.reset();
        router.push("/reports");
      }
    } catch (error) {
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      alert(`Transfer failed: ${errorMessage}. Please check your details and try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col">
        {/* Transfer Mode Toggle */}
        <div className="border-t border-gray-200 pb-6 pt-5">
          <div className="payment-transfer_form-item">
            <div className="payment-transfer_form-content">
              <p className="text-14 font-medium text-gray-700">Transfer To</p>
              <p className="text-12 font-normal text-gray-600">
                Choose where you want to send funds
              </p>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setTransferMode("own")}
                className={`px-4 py-2 rounded-lg text-14 font-medium transition-colors ${
                  transferMode === "own"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                My Account
              </button>
              <button
                type="button"
                onClick={() => setTransferMode("other")}
                className={`px-4 py-2 rounded-lg text-14 font-medium transition-colors ${
                  transferMode === "other"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Someone Else
              </button>
            </div>
          </div>
        </div>

        {/* Source Bank */}
        <FormField
          control={form.control}
          name="senderBank"
          render={() => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Select Source Bank
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Select the bank account you want to transfer funds from
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <BankDropdown
                      accounts={accounts}
                      setValue={form.setValue}
                      otherStyles="!w-full"
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        {/* Transfer Note */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Transfer Note
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Please provide any additional information or instructions
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Textarea
                      placeholder="Write a short note here"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        {/* Destination - Own Account */}
        {transferMode === "own" && (
          <FormField
            control={form.control}
            name="receiverBank"
            render={() => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item pb-6 pt-5">
                  <div className="payment-transfer_form-content">
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Select Destination Account
                    </FormLabel>
                    <FormDescription className="text-12 font-normal text-gray-600">
                      Select the account you want to transfer funds to
                    </FormDescription>
                  </div>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <BankDropdown
                        accounts={accounts}
                        setValue={form.setValue}
                        fieldName="receiverBank"
                        label="Select destination account"
                        otherStyles="!w-full"
                        defaultIndex={accounts.length > 1 ? 1 : 0}
                      />
                    </FormControl>
                    <FormMessage className="text-12 text-red-500" />
                  </div>
                </div>
              </FormItem>
            )}
          />
        )}

        {/* Destination - Someone Else */}
        {transferMode === "other" && (
          <>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="border-t border-gray-200">
                  <div className="payment-transfer_form-item py-5">
                    <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                      Recipient&apos;s Email Address
                    </FormLabel>
                    <div className="flex w-full flex-col">
                      <FormControl>
                        <Input
                          placeholder="ex: johndoe@gmail.com"
                          className="input-class"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-12 text-red-500" />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sharableId"
              render={({ field }) => (
                <FormItem className="border-t border-gray-200">
                  <div className="payment-transfer_form-item pb-5 pt-6">
                    <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                      Receiver&apos;s Plaid Sharable Id
                    </FormLabel>
                    <div className="flex w-full flex-col">
                      <FormControl>
                        <Input
                          placeholder="Enter the public account number"
                          className="input-class"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-12 text-red-500" />
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </>
        )}

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="border-y border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Amount
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="ex: 5.00"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_btn-box">
          <Button type="submit" className="payment-transfer_btn">
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> &nbsp; Sending...
              </>
            ) : (
              "Transfer Funds"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentTransferForm;
