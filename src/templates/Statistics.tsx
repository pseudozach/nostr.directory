import { Section } from '../layout/Section';
import { Stats } from './Stats';

const Statistics = () => {
  // const [cumulativePubKeyStats, setCumulativePubKeyStats] = useState([
  //   { x: '1/1', y: 0 },
  // ]);
  // const [dailyEventCountStats, setDailyEventCountStats] = useState([
  //   { x: '1/1', y: 0 },
  // ]);
  // const [dailyEventsByKindStats, setDailyEventsByKindStats] = useState([]);

  // const fetchStats = async () => {
  //   const response = await axios.get(`/api/stats?type=cumulativePubKey`);
  //   // console.log('got data ', response.data);
  //   setCumulativePubKeyStats(response.data);

  //   const response2 = await axios.get(`/api/stats?type=dailyEventCount`);
  //   // console.log('got data ', response2.data);
  //   setDailyEventCountStats(response2.data);

  //   const response3 = await axios.get(`/api/stats?type=dailyEventsByKind`);
  //   // console.log('got data ', response3.data);
  //   setDailyEventsByKindStats(response3.data);
  // };

  // useEffect(() => {
  //   fetchStats();
  // }, []);

  return (
    <>
      <Section yPadding="pt-20 max-w-screen-xl">
        <h1 className="font-black md:text-[56px] text-[40px] text-nostr-solid-darker tracking-tight text-center leading-[48px] md:leading-[68px]">
          Live Statistics from Nostr Relays
        </h1>
        <p className="text-center font-medium	mt-4 mb-8 text-[16px] md:text-[22px] text-nostr-solid-darker max-w-2xl mx-auto">
          Data is collected by nostr.directory crawler from over 250+
          distributed relays. Last 1 hour of data is shown.
        </p>

        <Section mxWidth="max-w-screen-xl" yPadding="m-0">
          <Stats
          // cumulativePubKeyStats={cumulativePubKeyStats}
          // dailyEventCountStats={dailyEventCountStats}
          // dailyEventsByKindStats={dailyEventsByKindStats}
          />
        </Section>
      </Section>
      <style jsx>
        {`
          h1 span {
            background: linear-gradient(
                215.68deg,
                #5684c9 -18.74%,
                #d3a7ff 103.35%
              ),
              linear-gradient(0deg, #27363a, #27363a);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
          }
          .updateList {
            width: 100%;
            border-bottom-left-radius: 12px;
            border-bottom-right-radius: 12px;
            background-color: white;
            border: 1px solid rgba(224, 224, 224, 1);
            border-top: unset;
            font-weight: 500;
            font-size: 13px;
            display: flex;
            flex-direction: row;
            align-items: center;

            color: #27363a;
            justify-content: flex-end;
            gap: 12px;
          }
          @media (min-width: 0) {
            .updateList {
              padding: 12px;
            }
          }
          @media (min-width: 700px) {
            .updateList {
              padding: 12px 32px;
            }
          }
          .gridContainer {
            box-shadow: 0px 12px 40px rgba(69, 93, 101, 0.12);
          }
          .warningContainer {
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 8px 16px;
            gap: 16px;
            background: #faf5f1;
            border-radius: 8px;
            margin-top: 24px;
          }
          .warningContainer p {
            font-weight: 400;
            font-size: 13px;
          }
        `}
      </style>
    </>
  );
};

export { Statistics };
