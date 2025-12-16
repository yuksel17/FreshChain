// freshchain-ui/src/contract.js

export const CONTRACT_ADDRESS =
  "0xC866226946D9467c834828Bfd3c2C9A3655e490F";



export const CONTRACT_ABI = [
  
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        },
        {
          "internalType": "int256",
          "name": "temperature",
          "type": "int256"
        },
        {
          "internalType": "int256",
          "name": "humidity",
          "type": "int256"
        },
        {
          "internalType": "string",
          "name": "location",
          "type": "string"
        }
      ],
      "name": "addSensorData",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "passedInspection",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "retailer",
          "type": "address"
        }
      ],
      "name": "ArrivedAtRetailer",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "productName",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "quantity",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "producer",
          "type": "address"
        }
      ],
      "name": "BatchCreated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "productName",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "quantity",
          "type": "uint256"
        }
      ],
      "name": "createBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "distributor",
          "type": "address"
        }
      ],
      "name": "DistributorRegistered",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "passedInspection",
          "type": "bool"
        }
      ],
      "name": "markAsArrived",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "to",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "producer",
          "type": "address"
        }
      ],
      "name": "ProducerRegistered",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "distributor",
          "type": "address"
        }
      ],
      "name": "registerDistributor",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "producer",
          "type": "address"
        }
      ],
      "name": "registerProducer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "retailer",
          "type": "address"
        }
      ],
      "name": "registerRetailer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "transporter",
          "type": "address"
        }
      ],
      "name": "registerTransporter",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "retailer",
          "type": "address"
        }
      ],
      "name": "RetailerRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "int256",
          "name": "temperature",
          "type": "int256"
        },
        {
          "indexed": false,
          "internalType": "int256",
          "name": "humidity",
          "type": "int256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "location",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "transporter",
          "type": "address"
        }
      ],
      "name": "SensorDataAdded",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "transporter",
          "type": "address"
        }
      ],
      "name": "TransporterRegistered",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "batches",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "productName",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "quantity",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "currentOwner",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "arrivedAtRetailer",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "passedInspection",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "distributors",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        }
      ],
      "name": "getBatchHistory",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "batchId",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "productName",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "quantity",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "creator",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "currentOwner",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "arrivedAtRetailer",
              "type": "bool"
            },
            {
              "internalType": "bool",
              "name": "passedInspection",
              "type": "bool"
            },
            {
              "internalType": "bool",
              "name": "exists",
              "type": "bool"
            }
          ],
          "internalType": "struct FreshChain.Batch",
          "name": "batch",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "int256",
              "name": "temperature",
              "type": "int256"
            },
            {
              "internalType": "int256",
              "name": "humidity",
              "type": "int256"
            },
            {
              "internalType": "string",
              "name": "location",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "recordedBy",
              "type": "address"
            }
          ],
          "internalType": "struct FreshChain.SensorData[]",
          "name": "sensors",
          "type": "tuple[]"
        },
        {
          "components": [
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            }
          ],
          "internalType": "struct FreshChain.TransferEvent[]",
          "name": "ownerships",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "batchId",
          "type": "uint256"
        }
      ],
      "name": "getCounts",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "sensorCount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "transferCount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "producers",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "retailers",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "transporters",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];
