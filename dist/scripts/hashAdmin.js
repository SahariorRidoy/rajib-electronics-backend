import { hashPassword } from "../utils/hash.js";
const plain = "123456";
const main = async () => {
    const hashed = await hashPassword(plain);
    // console.log(" Hashed Password:\n", hashed);
};
main();
