"use server";

import { Client } from "dwolla-v2";

const getEnvironment = (): "production" | "sandbox" => {
  const environment = process.env.DWOLLA_ENV as string;

  switch (environment) {
    case "sandbox":
      return "sandbox";
    case "production":
      return "production";
    default:
      throw new Error(
        "Dwolla environment should either be set to `sandbox` or `production`"
      );
  }
};

const dwollaClient = new Client({
  environment: getEnvironment(),
  key: process.env.DWOLLA_KEY as string,
  secret: process.env.DWOLLA_SECRET as string,
});

// Create a Dwolla Funding Source using a Plaid Processor Token
export const createFundingSource = async (
  options: CreateFundingSourceOptions
) => {
  try {
    const response = await dwollaClient.post(
      `customers/${options.customerId}/funding-sources`,
      {
        name: options.fundingSourceName,
        plaidToken: options.plaidToken,
      }
    );
    const location = response.headers.get("location");
    
    if (!location) {
      return null;
    }
    
    return location;
  } catch (err: any) {
    return null;
  }
};

export const createOnDemandAuthorization = async () => {
  try {
    const onDemandAuthorization = await dwollaClient.post(
      "on-demand-authorizations"
    );
    const authLink = onDemandAuthorization.body._links;
    
    if (!authLink) {
      return null;
    }
    
    return authLink;
  } catch (err: any) {
    return null;
  }
};

export const createDwollaCustomer = async (newCustomer: NewDwollaCustomerParams) => {
  try {
    return await dwollaClient
      .post("customers", newCustomer)
      .then((res) => res.headers.get("location"));
  } catch (err: any) {
    
    // If customer already exists, extract the URL from the error
    if (err.body?.code === "ValidationError" && err.body?._embedded?.errors?.[0]?.code === "Duplicate") {
      const existingCustomerUrl = err.body._embedded.errors[0]._links?.about?.href;
      if (existingCustomerUrl) {
        return existingCustomerUrl;
      }
    }
    
    throw err;
  }
};
export const createTransfer = async ({
  sourceFundingSourceUrl,
  destinationFundingSourceUrl,
  amount,
}: TransferParams) => {
  try {
    if (!sourceFundingSourceUrl) {
      return null;
    }
    
    if (!destinationFundingSourceUrl) {
      return null;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      return null;
    }
    
    const requestBody = {
      _links: {
        source: {
          href: sourceFundingSourceUrl,
        },
        destination: {
          href: destinationFundingSourceUrl,
        },
      },
      amount: {
        currency: "USD",
        value: amount,
      },
    };

    const response = await dwollaClient.post("transfers", requestBody);
    const transferLocation = response.headers.get("location");
    
    if (!transferLocation) {
      return null;
    }
    
    return transferLocation;
  } catch (err: any) {
    // Return null instead of throwing to avoid serialization issues
    // The calling code checks for null and handles it appropriately
    return null;
  }
};

export const addFundingSource = async ({
  dwollaCustomerId,
  processorToken,
  bankName,
}: AddFundingSourceParams) => {
  try {
    if (!dwollaCustomerId) {
      return null;
    }
    
    if (!processorToken) {
      return null;
    }
    
    // create dwolla auth link
    const dwollaAuthLinks = await createOnDemandAuthorization();

    // add funding source to the dwolla customer & get the funding source url
    const fundingSourceOptions = {
      customerId: dwollaCustomerId,
      fundingSourceName: bankName,
      plaidToken: processorToken,
      _links: dwollaAuthLinks,
    };
    return await createFundingSource(fundingSourceOptions);
  } catch (err: any) {
    return null;
  }
};