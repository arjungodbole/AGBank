"use server";

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
            const { database } = await createAdminClient();

            const documentData = {
                channel: 'online',
                category: 'Transfer',
                ...transaction
            };
            console.log('📝 Creating transaction with data:', JSON.stringify(documentData, null, 2));
            console.log('📝 DATABASE_ID:', DATABASE_ID);
            console.log('📝 TRANSACTION_COLLECTION_ID:', TRANSACTION_COLLECTION_ID);

            const newTransaction = await database.createDocument(
                DATABASE_ID!,
                TRANSACTION_COLLECTION_ID!,
                ID.unique(),
                documentData
            )
            console.log('✅ Transaction created successfully:', newTransaction.$id);
            return parseStringify(newTransaction);
        } catch (error: any){
            console.error('❌ createTransaction failed:', error?.message || error);
            console.error('❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
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
                return parseStringify({
                    total: 0,
                    documents: []
                });
            }
        }