/** A consistent set of two-tone line illustrations for the four process steps. */
export function ProcessIcon({step}:{step:number}){
 return <svg className="process-illustration" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
 <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
 {step===0&&<>
 <path d="M17 10h21l10 10v31a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Z" fill="white"/>
 <path d="M38 10v10h10" fill="#eaeaea"/>
 <path d="M22 26h12M22 33h9M22 40h6" stroke="#b1b1b1"/>
 <rect x="34" y="33" width="23" height="23" rx="7" fill="#ececec"/>
 <path d="M45.5 50V39m-4 4 4-4 4 4"/>
 </>}
 {step===1&&<>
 <rect x="12" y="10" width="34" height="44" rx="4" fill="white"/>
 <path d="m20 22 2 2 4-5m-6 13 2 2 4-5M32 22h6M32 32h5M20 43h8" stroke="#adadad"/>
 <circle cx="43" cy="41" r="11" fill="#ececec"/>
 <path d="m51 49 6 6m-18-14 3 3 5-6"/>
 </>}
 {step===2&&<>
 <rect x="23" y="8" width="18" height="14" rx="4" fill="white"/>
 <path d="M32 22v10M15 40v-8h34v8" stroke="#aeaeae"/>
 <rect x="7" y="40" width="17" height="16" rx="4" fill="white" stroke="#b0b0b0"/>
 <rect x="40" y="40" width="17" height="16" rx="4" fill="#e9e9e9"/>
 <path d="m44.5 48 3 3 5-6M29 15h6M12 48h7"/>
 <circle cx="32" cy="32" r="3" fill="#ececec"/>
 </>}
 {step===3&&<>
 <rect x="13" y="9" width="37" height="47" rx="5" fill="white"/>
 <rect x="20" y="16" width="23" height="11" rx="2" fill="#ececec" stroke="#b1b1b1"/>
 <path d="M24 34h2m9 0h2m-13 8h2m9 0h2m-13 8h2" stroke="#a3a3a3" strokeWidth="2.5"/>
 <circle cx="47" cy="47" r="11" fill="#e9e9e9"/>
 <path d="M42 44h10M42 50h10"/>
 </>}
 </g></svg>;
}
