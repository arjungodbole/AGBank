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

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(4, "Transfer note is too short"),
  amount: z.string().min(4, "Amount is too short"),
  senderBank: z.string().min(4, "Please select a valid bank account"),
  sharableId: z.string().min(8, "Please select a valid sharable Id"),
});

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      amount: "",
      senderBank: "",
      sharableId: "",
    },
  });

  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      console.log("🔍 Transfer form data:", {
        sharableId: data.sharableId,
        senderBank: data.senderBank,
        amount: data.amount,
      });

      const receiverAccountId = decryptId(data.sharableId);
      console.log("🔍 Decrypted receiver account ID:", receiverAccountId);

      const receiverBank = await getBankByAccountId({
        accountId: receiverAccountId,
      });
      console.log("🔍 Receiver bank found:", !!receiverBank, receiverBank?.$id);
      console.log("🔍 Receiver bank details:", {
        id: receiverBank?.$id,
        accountID: receiverBank?.accountID,
        fundingSourceUrl: receiverBank?.fundingSourceUrl,
        userId: receiverBank?.userId,
      });

      const senderBank = await getBank({ documentId: data.senderBank });
      console.log("🔍 Sender bank found:", !!senderBank, senderBank?.$id);
      console.log("🔍 Sender bank details:", {
        id: senderBank?.$id,
        accountID: senderBank?.accountID,
        fundingSourceUrl: senderBank?.fundingSourceUrl,
        userId: senderBank?.userId,
      });

      // Check if sender and receiver are the same
      if (senderBank?.$id === receiverBank?.$id) {
        console.error("❌ Cannot transfer to the same account");
        alert(
          "Cannot transfer to the same account. Please select different accounts."
        );
        setIsLoading(false);
        return;
      }

      // Check if both banks were found
      if (!receiverBank) {
        console.error(
          "❌ Receiver bank not found for account ID:",
          receiverAccountId
        );
        alert("Receiver bank not found. Please check the shareable ID.");
        setIsLoading(false);
        return;
      }

      if (!senderBank) {
        console.error(
          "❌ Sender bank not found for document ID:",
          data.senderBank
        );
        alert("Sender bank not found. Please try again.");
        setIsLoading(false);
        return;
      }

      console.log("🏦 Transfer details:", {
        senderBank: senderBank.$id,
        receiverBank: receiverBank.$id,
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
        console.error("❌ Dwolla transfer failed");
        alert(
          "Transfer failed. Please check your account details and try again."
        );
        setIsLoading(false);
        return;
      }

      console.log("✅ Dwolla transfer successful, creating transaction record");

      // create transfer transaction
      const transaction = {
        name: data.name,
        amount: data.amount,
        senderId: senderBank.userId.$id,
        senderBankId: senderBank.$id,
        receiverId: receiverBank.userId.$id,
        receiverBankId: receiverBank.$id,
        email: data.email,
      };

      const newTransaction = await createTransaction(transaction);

      if (newTransaction) {
        console.log("✅ Transaction record created successfully");
        form.reset();
        router.push("/reports");
      } else {
        console.error("❌ Failed to create transaction record");
        alert("Transfer completed but failed to save transaction record.");
      }
    } catch (error) {
      console.error("❌ Submitting create transfer request failed: ", error);
      alert("Transfer failed. Please check your details and try again.");
    }

    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col">
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

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Transfer Note (Optional)
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Please provide any additional information or instructions
                    related to the transfer
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

        <div className="payment-transfer_form-details">
          <h2 className="text-18 font-semibold text-gray-900">
            Bank account details
          </h2>
          <p className="text-16 font-normal text-gray-600">
            Enter the bank account details of the recipient
          </p>
        </div>

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
