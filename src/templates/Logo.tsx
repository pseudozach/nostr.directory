type ILogoProps = {
  xl?: boolean;
};

const Logo = (props: ILogoProps) => {
  const size = props.xl ? '72' : '32';
  const fontStyle = props.xl
    ? 'font-semibold text-3xl'
    : 'font-semibold text-xl';

  return (
    <span className={`text-gray-900 inline-flex items-center ${fontStyle}`}>
      {/* <Image src="/icon80.png" alt="logo" width={size} height={size} /> */}

      <svg
        width="100%"
        height={size}
        viewBox="0 0 1949 502"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M510.4 301.8V248.6C510.4 232.6 519.6 222.2 534.6 222.2C547.2 222.2 555.4 230.2 555.4 246.8V301.8H579.8V241C579.8 215.4 567 200 542.2 200C528.8 200 516.8 205.8 510.6 215.8L508.6 203H486V301.8H510.4Z"
          fill="url(#paint0_linear_1_195)"
        />
        <path
          d="M597.973 252.2C597.973 283 620.173 304.2 650.773 304.2C681.373 304.2 703.573 283 703.573 252.2C703.573 221.4 681.373 200.2 650.773 200.2C620.173 200.2 597.973 221.4 597.973 252.2ZM622.373 252.2C622.373 234.2 633.973 222 650.773 222C667.573 222 679.173 234.2 679.173 252.2C679.173 270.2 667.573 282.4 650.773 282.4C633.973 282.4 622.373 270.2 622.373 252.2Z"
          fill="url(#paint1_linear_1_195)"
        />
        <path
          d="M715.314 271.8C715.314 291.2 730.914 304.4 755.514 304.4C779.914 304.4 796.914 292 796.914 272C796.914 256.8 788.514 249.2 771.914 245.4L754.114 241.2C745.714 239.2 741.314 235.6 741.314 230C741.314 222.6 746.914 218.2 756.514 218.2C765.914 218.2 771.514 223.6 771.714 232H794.914C794.714 212.8 779.714 200 757.514 200C734.714 200 718.314 211.6 718.314 231C718.314 246.8 726.914 255.2 744.714 259.2L762.514 263.4C771.314 265.4 773.914 269 773.914 274C773.914 281.2 767.714 285.8 756.314 285.8C745.114 285.8 738.714 280.4 738.514 271.8H715.314Z"
          fill="url(#paint2_linear_1_195)"
        />
        <path
          d="M849.092 301.8V223.4H868.292V203H849.092V172.2H824.692V203H805.692V223.4H824.692V301.8H849.092Z"
          fill="url(#paint3_linear_1_195)"
        />
        <path
          d="M945.461 202.6C941.461 201.6 938.061 201.2 934.661 201.2C921.461 201.2 912.061 207.8 907.861 217.6L906.461 203.2H883.461V301.8H907.861V253.8C907.861 234.6 918.861 225.2 936.461 225.2H945.461V202.6Z"
          fill="url(#paint4_linear_1_195)"
        />
        <path
          d="M961.58 304.2C970.38 304.2 977.78 297 977.78 288.4C977.78 279.6 970.38 272.4 961.58 272.4C952.78 272.4 945.38 279.6 945.38 288.4C945.38 297 952.78 304.2 961.58 304.2Z"
          fill="url(#paint5_linear_1_195)"
        />
        <path
          d="M1037.93 304.4C1052.93 304.4 1065.73 297.8 1071.73 286.4L1073.33 301.8H1095.73V153H1071.53V215.6C1065.33 205.8 1053.13 200 1039.33 200C1009.53 200 991.528 222 991.528 252.8C991.528 283.4 1009.33 304.4 1037.93 304.4ZM1043.33 282C1026.33 282 1015.93 269.6 1015.93 252C1015.93 234.4 1026.33 221.8 1043.33 221.8C1060.33 221.8 1071.33 234.2 1071.33 252C1071.33 269.8 1060.33 282 1043.33 282Z"
          fill="url(#paint6_linear_1_195)"
        />
        <path
          d="M1133.36 183.2C1141.36 183.2 1147.96 176.6 1147.96 168.4C1147.96 160.2 1141.36 153.8 1133.36 153.8C1124.96 153.8 1118.36 160.2 1118.36 168.4C1118.36 176.6 1124.96 183.2 1133.36 183.2ZM1121.16 301.8H1145.56V203H1121.16V301.8Z"
          fill="url(#paint7_linear_1_195)"
        />
        <path
          d="M1232.77 202.6C1228.77 201.6 1225.37 201.2 1221.97 201.2C1208.77 201.2 1199.37 207.8 1195.17 217.6L1193.77 203.2H1170.77V301.8H1195.17V253.8C1195.17 234.6 1206.17 225.2 1223.77 225.2H1232.77V202.6Z"
          fill="url(#paint8_linear_1_195)"
        />
        <path
          d="M1290.16 304.4C1315.96 304.4 1333.96 291.4 1338.16 269.8H1315.56C1312.76 279.2 1303.96 284.4 1290.56 284.4C1274.36 284.4 1265.16 275.6 1263.36 258.2L1337.76 258V250.6C1337.76 219.8 1318.96 200 1289.36 200C1260.36 200 1240.16 221.4 1240.16 252.4C1240.16 283 1260.76 304.4 1290.16 304.4ZM1289.56 220C1304.16 220 1313.56 229 1313.56 242.6H1263.96C1266.36 227.8 1275.16 220 1289.56 220Z"
          fill="url(#paint9_linear_1_195)"
        />
        <path
          d="M1351.49 252.2C1351.49 283.6 1371.09 304.4 1401.09 304.4C1426.89 304.4 1446.09 288.6 1449.09 265.6H1424.49C1421.89 276.4 1413.29 282.4 1401.09 282.4C1385.49 282.4 1375.89 270.8 1375.89 252.2C1375.89 233.6 1386.29 221.8 1401.89 221.8C1413.49 221.8 1421.69 227.6 1424.49 238.8H1448.89C1446.29 215 1427.89 200 1400.89 200C1371.69 200 1351.49 221.6 1351.49 252.2Z"
          fill="url(#paint10_linear_1_195)"
        />
        <path
          d="M1500.85 301.8V223.4H1520.05V203H1500.85V172.2H1476.45V203H1457.45V223.4H1476.45V301.8H1500.85Z"
          fill="url(#paint11_linear_1_195)"
        />
        <path
          d="M1528.44 252.2C1528.44 283 1550.64 304.2 1581.24 304.2C1611.84 304.2 1634.04 283 1634.04 252.2C1634.04 221.4 1611.84 200.2 1581.24 200.2C1550.64 200.2 1528.44 221.4 1528.44 252.2ZM1552.84 252.2C1552.84 234.2 1564.44 222 1581.24 222C1598.04 222 1609.64 234.2 1609.64 252.2C1609.64 270.2 1598.04 282.4 1581.24 282.4C1564.44 282.4 1552.84 270.2 1552.84 252.2Z"
          fill="url(#paint12_linear_1_195)"
        />
        <path
          d="M1715.38 202.6C1711.38 201.6 1707.98 201.2 1704.58 201.2C1691.38 201.2 1681.98 207.8 1677.78 217.6L1676.38 203.2H1653.38V301.8H1677.78V253.8C1677.78 234.6 1688.78 225.2 1706.38 225.2H1715.38V202.6Z"
          fill="url(#paint13_linear_1_195)"
        />
        <path
          d="M1726.23 347.6C1731.63 349 1737.63 349.8 1744.43 349.8C1760.63 349.8 1771.03 342.2 1778.43 323.8L1826.83 203H1801.63L1774.83 275L1749.43 203H1723.63L1763.43 306L1760.63 313.4C1756.43 325 1750.43 327.2 1740.83 327.2H1726.23V347.6Z"
          fill="url(#paint14_linear_1_195)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M233.42 151.5H362.5V153.5H360.5C362.5 153.5 362.5 153.499 362.5 153.5V267.788L361.963 268.364L360.5 267C361.963 268.364 361.963 268.364 361.963 268.364L285.148 350.737L189.64 325.711L132.73 217.431C132.73 217.431 132.729 217.43 134.5 216.5L132.73 217.431L131.871 215.797L233.42 151.5ZM139.471 215.72L232.551 156.784L247.987 243.784L139.471 215.72ZM255.01 245.306L317.997 257.045L355.776 160.113L255.01 245.306ZM316.519 260.838L253.471 249.088L268.995 295.661L308.068 282.522L316.519 260.838ZM313.008 280.861L320.521 261.584L352.57 267.557L313.008 280.861ZM306.175 287.379L270.26 299.456L284.647 342.616L306.175 287.379ZM281.435 345.629L266.469 300.731L197.982 323.762L281.435 345.629ZM196.583 320.013L265.204 296.936L249.793 250.705L196.583 320.013ZM247.073 247.68L191.316 320.303L138.371 219.567L247.073 247.68ZM290.151 339.507L311.116 285.717L353.649 271.414L290.151 339.507ZM322 257.791L358.5 164.139V264.593L322 257.791ZM251.862 242.729L355.037 155.5H236.386L251.862 242.729Z"
          fill="url(#paint15_linear_1_195)"
        />
        <circle cx="235" cy="150" r="41" fill="url(#paint16_linear_1_195)" />
        <circle cx="190" cy="320" r="34" fill="url(#paint17_linear_1_195)" />
        <circle cx="360" cy="267" r="34" fill="url(#paint18_linear_1_195)" />
        <circle cx="360" cy="154" r="15" fill="url(#paint19_linear_1_195)" />
        <circle cx="135" cy="216" r="15" fill="url(#paint20_linear_1_195)" />
        <circle cx="250" cy="246" r="15" fill="url(#paint21_linear_1_195)" />
        <circle cx="284" cy="348" r="15" fill="url(#paint22_linear_1_195)" />
        <defs>
          <linearGradient
            id="paint0_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint1_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint2_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint3_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint4_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint5_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint6_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint7_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint8_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint9_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint10_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint11_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint12_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint13_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint14_linear_1_195"
            x1="1828.4"
            y1="89.8"
            x2="1785.38"
            y2="498.048"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5684C9" />
            <stop offset="1" stopColor="#D3A7FF" />
          </linearGradient>
          <linearGradient
            id="paint15_linear_1_195"
            x1="362.5"
            y1="151.5"
            x2="247.374"
            y2="403.504"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B9A0F4" />
            <stop offset="1" stopColor="#2F5977" />
          </linearGradient>
          <linearGradient
            id="paint16_linear_1_195"
            x1="276"
            y1="109"
            x2="224.193"
            y2="206.967"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B9A0F4" />
            <stop offset="1" stopColor="#2F5977" />
          </linearGradient>
          <linearGradient
            id="paint17_linear_1_195"
            x1="224"
            y1="286"
            x2="181.038"
            y2="367.241"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B9A0F4" />
            <stop offset="1" stopColor="#2F5977" />
          </linearGradient>
          <linearGradient
            id="paint18_linear_1_195"
            x1="394"
            y1="233"
            x2="351.038"
            y2="314.241"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B9A0F4" />
            <stop offset="1" stopColor="#2F5977" />
          </linearGradient>
          <linearGradient
            id="paint19_linear_1_195"
            x1="375"
            y1="139"
            x2="356.046"
            y2="174.842"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B9A0F4" />
            <stop offset="1" stopColor="#2F5977" />
          </linearGradient>
          <linearGradient
            id="paint20_linear_1_195"
            x1="150"
            y1="201"
            x2="131.046"
            y2="236.842"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B9A0F4" />
            <stop offset="1" stopColor="#2F5977" />
          </linearGradient>
          <linearGradient
            id="paint21_linear_1_195"
            x1="265"
            y1="231"
            x2="246.046"
            y2="266.842"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B9A0F4" />
            <stop offset="1" stopColor="#2F5977" />
          </linearGradient>
          <linearGradient
            id="paint22_linear_1_195"
            x1="299"
            y1="333"
            x2="280.046"
            y2="368.842"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B9A0F4" />
            <stop offset="1" stopColor="#2F5977" />
          </linearGradient>
        </defs>
      </svg>

      {/* <svg
        className="text-primary-500 stroke-current mr-1"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M0 0h24v24H0z" stroke="none" />
        <rect x="3" y="12" width="6" height="8" rx="1" />
        <rect x="9" y="8" width="6" height="12" rx="1" />
        <rect x="15" y="4" width="6" height="16" rx="1" />
        <path d="M4 20h14" />
      </svg>

      {/* {AppConfig.site_name} */}
    </span>
  );
};

export { Logo };
