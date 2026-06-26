import { ff } from '../tokens.js';
import { I } from '../atoms/Icon.jsx';

export const Bk = ({onClick,l="Back"})=><button onClick={onClick} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"10px 0",minHeight:44,fontFamily:ff}}><I n="left" s={20} c="#fff"/><span style={{fontSize:14,color:"rgba(255,255,255,.7)",fontWeight:500}}>{l}</span></button>;
export default Bk;
