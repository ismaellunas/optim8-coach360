import { C } from '../tokens.js';

export const Cd = ({children,sx,tap})=><div onClick={tap} style={{background:C.cd,borderRadius:18,padding:18,border:`1px solid ${C.ln}`,cursor:tap?"pointer":"default",...sx}}>{children}</div>;
export default Cd;
