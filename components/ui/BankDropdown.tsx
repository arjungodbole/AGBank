"use client";

import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { formUrlQuery, formatAmount } from "@/lib/utils";

export const BankDropdown = ({
  accounts = [],
  setValue,
  otherStyles,
  fieldName = "senderBank",
  label = "Select a bank to display",
  defaultIndex = 0,
}: BankDropdownProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialAccount = accounts[defaultIndex] || accounts[0];
  const [selected, setSelected] = useState(initialAccount);

  // Set initial form value on mount
  useEffect(() => {
    if (setValue && initialAccount) {
      // Use account.id (unique Plaid account ID) for form value
      setValue(fieldName, initialAccount.id);
    }
  }, [setValue, fieldName, initialAccount]);

  const handleBankChange = (id: string) => {
    const account = accounts.find((account) => account.id === id)!;

    setSelected(account);

    if (setValue) {
      // If setValue is provided, we're in a form (like PaymentTransferForm)
      // Use account.id (unique Plaid account ID) for form value
      setValue(fieldName, account.id);
    } else {
      // If no setValue, we're switching accounts on reports page
      // Update URL and redirect with account.id
      const newUrl = formUrlQuery({
        params: searchParams.toString(),
        key: "id",
        value: id,
      });
      router.push(newUrl);
    }
  };

  return (
    <Select
      defaultValue={selected.id}
      onValueChange={(value) => handleBankChange(value)}
    >
      <SelectTrigger
        className={`flex w-full bg-white gap-3 md:w-[300px] ${otherStyles}`}
      >
        <Image
          src="icons/credit-card.svg"
          width={20}
          height={20}
          alt="account"
        />
        <p className="line-clamp-1 w-full text-left">{selected.name}</p>
      </SelectTrigger>
      <SelectContent
        className={`w-full bg-white md:w-[300px] ${otherStyles}`}
        align="end"
      >
        <SelectGroup>
          <SelectLabel className="py-2 font-normal text-gray-500">
            {label}
          </SelectLabel>
          {accounts.map((account: Account) => (
            <SelectItem
              key={account.id}
              value={account.id}
              className="cursor-pointer border-t"
            >
              <div className="flex flex-col ">
                <p className="text-16 font-medium">{account.name}</p>
                <p className="text-14 font-medium text-blue-600">
                  {formatAmount(account.currentBalance)}
                </p>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
