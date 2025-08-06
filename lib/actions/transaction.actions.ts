import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite"
import { parseStringify } from "../utils";
const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID ,
    // APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
  } = process.env;
  

export const createTransaction = async (transaction : 
    CreateTransactionProps) => {
        try{
            console.log("🔍 Creating transaction with data:", {
                databaseId: DATABASE_ID,
                collectionId: TRANSACTION_COLLECTION_ID,
                transactionData: transaction
            });

            const { database } = await createAdminClient();
            const newTransaction = await database.createDocument(
                DATABASE_ID!,
                TRANSACTION_COLLECTION_ID!,
                ID.unique(),{
                    channel: 'online',
                    category: 'Transfer',
                    ...transaction
                }
            )
            console.log("✅ Transaction created successfully:", newTransaction.$id);
            return parseStringify(newTransaction);
        } catch (error){
            console.error("❌ Error in createTransaction:", error);
            console.error("❌ Error details:", {
                message: error.message,
                code: error.code,
                response: error.response
            });
            return null;
        }
    }

    export const getTransactionsByBankId = async ({bankId} : 
        getTransactionsByBankIdProps) => {
            try{
                const { database } = await createAdminClient();

                const senderTransactions = await database.listDocuments(
                    DATABASE_ID!,
                    TRANSACTION_COLLECTION_ID!,
                    [Query.equal('senderBankId', bankId)],
                )

                const recieverTransactions = await database.listDocuments(
                    DATABASE_ID!,
                    TRANSACTION_COLLECTION_ID!,
                    [Query.equal('recieverBankId', bankId)],
                )

                const transactions = {
                    total: senderTransactions.total +
                    recieverTransactions.total,
                    documents: [
                        ...senderTransactions.documents,
                        ...recieverTransactions.documents
                    ]
                }
                  
                return parseStringify(transactions);
            } catch (error){
                console.error("❌ Error in getTransactionsByBankId:", error);
                return parseStringify({
                    total: 0,
                    documents: []
                });
            }
        }