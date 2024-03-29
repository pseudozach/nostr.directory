import { Stack, Card } from '@mui/material';

const oneDay = 1 * 24 * 60 * 60 * 1000;

export const CardContainer = ({ children }: any) => {
  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: 600,
        height: 480,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '40px 10px',
      }}
    >
      {children}
    </Card>
  );
};

export function Stats() {
  return (
    <>
      <Stack
        spacing={5}
        direction={{ xs: 'column', lg: 'row' }}
        className="!content-evenly !items-center mb-4"
      >
        <iframe
          src={`https://grafana.nostr.directory/d-solo/E5QpXGAVk/nostr-events?orgId=1&from=${
            Date.now() - oneDay
          }&to=${Date.now()}&panelId=9`}
          allowFullScreen={true}
          frameBorder={0}
          width="100%"
          height="480"
        ></iframe>

        <iframe
          src={`https://grafana.nostr.directory/d-solo/E5QpXGAVk/nostr-events?orgId=1&from=${
            Date.now() - oneDay
          }&to=${Date.now()}&panelId=11`}
          allowFullScreen={true}
          frameBorder={0}
          width="100%"
          height="480"
        ></iframe>

        <iframe
          src={`https://grafana.nostr.directory/d-solo/E5QpXGAVk/nostr-events?orgId=1&from=${
            Date.now() - oneDay
          }&to=${Date.now()}&panelId=7`}
          allowFullScreen={true}
          frameBorder={0}
          width="100%"
          height="480"
        ></iframe>

        <iframe
          src={`https://grafana.nostr.directory/d-solo/E5QpXGAVk/nostr-events?orgId=1&from=${
            Date.now() - oneDay
          }&to=${Date.now()}&panelId=5`}
          allowFullScreen={true}
          frameBorder={0}
          width="100%"
          height="480"
        ></iframe>

        {/* <CardContainer>
          <Stack direction="column" className="text-center">
            <div className="h-16">
              <Typography variant="h5">Total Number of Public Keys</Typography>
              <Typography color="success" variant="h6">
                {cumulativePubKeyStats[cumulativePubKeyStats.length - 1]?.y ||
                  0}
              </Typography>
            </div>
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={10} // padding={{ left: 60 }}
              // width={100}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={({ datum }) => datum.y}
                  labelComponent={
                    <VictoryTooltip
                      cornerRadius={0}
                      flyoutStyle={{
                        fill: 'white',
                      }}
                    />
                  }
                />
              }
            >
              <VictoryAxis
                dependentAxis
                style={{
                  axisLabel: {
                    fontSize: 100,
                    padding: 30,
                  },
                }}
                tickFormat={(x) => `${x / 1000}k`}
              />
              <VictoryAxis
                style={{
                  axisLabel: {
                    fontSize: 10,
                    padding: 30,
                  },
                  tickLabels: {
                    angle: 45,
                  },
                }}
                tickFormat={(x) => `${x}`.slice(0, -4) + `${x}`.slice(-2)}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: '#1ADACE',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={cumulativePubKeyStats}
              />
            </VictoryChart>
          </Stack>
        </CardContainer>

        <CardContainer>
          <Stack direction="column" className="text-center">
            <div className="h-16">
              <Typography variant="h5">Daily Event Count</Typography>
              <Typography color="success" variant="h6">
                Today:{' '}
                {dailyEventCountStats[dailyEventCountStats.length - 1]?.y || 0}
              </Typography>
            </div>
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={20}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={({ datum }) => datum.y}
                  labelComponent={
                    <VictoryTooltip
                      cornerRadius={0}
                      flyoutStyle={{
                        fill: 'white',
                      }}
                    />
                  }
                />
              }
            >
              <VictoryAxis
                dependentAxis
                style={{
                  axisLabel: {
                    fontSize: 100,
                    padding: 30,
                  },
                }}
                tickFormat={(x) => `${x / 1000}k`}
              />
              <VictoryAxis
                tickFormat={(x) => `${x}`.slice(0, -4) + `${x}`.slice(-2)}
                style={{
                  axisLabel: {
                    fontSize: 10,
                    padding: 30,
                  },
                  tickLabels: {
                    angle: 45,
                  },
                }}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: '#1ADACE',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventCountStats}
              />
            </VictoryChart>
            <Typography variant="caption">
              Tracking event kinds: 0,1,2,3,5,7,40
            </Typography>
          </Stack>
        </CardContainer>

        <CardContainer>
          <Stack direction="column" className="text-center">
            <div className="h-16">
              <Typography variant="h5">Daily Profile Event Counts</Typography>
            </div>
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={20}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={({ datum }) => datum.y}
                  labelComponent={
                    <VictoryTooltip
                      cornerRadius={0}
                      flyoutStyle={{
                        fill: 'white',
                      }}
                    />
                  }
                />
              }
            >
              <VictoryAxis
                dependentAxis
                style={{
                  axisLabel: {
                    fontSize: 100,
                    padding: 30,
                  },
                }}
                tickFormat={(x) => `${x / 1000}k`}
              />
              <VictoryAxis // label="Label"
                tickFormat={(x) => `${x}`.slice(0, -4) + `${x}`.slice(-2)}
                style={{
                  // axis: { stroke: '#756f6a' },
                  axisLabel: {
                    fontSize: 10,
                    padding: 30,
                  },
                  tickLabels: {
                    angle: 45,
                  },
                }}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: '#1ADACE',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventsByKindStats[0]}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: '#c43a31',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventsByKindStats[2]}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: 'black',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventsByKindStats[3]}
              />
              <VictoryLegend
                x={0}
                y={10}
                centerTitle
                orientation="horizontal"
                gutter={20} // style={{ border: { stroke: 'black' } }}
                colorScale={['#1ADACE', '#c43a31', 'black']}
                data={[
                  {
                    name: 'Metadata',
                  },
                  {
                    name: 'Recommend Relay',
                  },
                  {
                    name: 'Contacts',
                  },
                ]}
              />
            </VictoryChart>
          </Stack>
        </CardContainer>
      </Stack>
      <Stack
        spacing={5}
        direction={{ xs: 'column', lg: 'row' }}
        className="!content-evenly !items-center"
      >
        <CardContainer>
          <Stack direction="column" className="text-center">
            <div className="h-16">
              <Typography variant="h5">Daily Post Event Counts</Typography>
            </div>
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={20}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={({ datum }) => datum.y}
                  labelComponent={
                    <VictoryTooltip
                      cornerRadius={0}
                      flyoutStyle={{
                        fill: 'white',
                      }}
                    />
                  }
                />
              }
            >
              <VictoryAxis
                dependentAxis
                style={{
                  axisLabel: {
                    fontSize: 100,
                    padding: 30,
                  },
                }}
                tickFormat={(x) => `${x / 1000}k`}
              />
              <VictoryAxis
                tickFormat={(x) => `${x}`.slice(0, -4) + `${x}`.slice(-2)}
                style={{
                  axisLabel: {
                    fontSize: 10,
                    padding: 30,
                  },
                  tickLabels: {
                    angle: 45,
                  },
                }}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: 'green',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventsByKindStats[1]}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: 'orange',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventsByKindStats[4]}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: 'purple',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventsByKindStats[5]}
              />
              <VictoryLegend
                x={0}
                y={10}
                centerTitle
                orientation="horizontal"
                gutter={20} // style={{ border: { stroke: 'black' } }}
                colorScale={['green', 'orange', 'purple', 'yellow']}
                data={[
                  {
                    name: 'Text',
                  },
                  {
                    name: 'Event Deletion',
                  },
                  {
                    name: 'Reaction',
                  },
                ]}
              />
            </VictoryChart>
          </Stack>
        </CardContainer> */}

        {/* <CardContainer>
          <Stack direction="column" className="text-center">
            <div className="h-16">
              <Typography variant="h5">Daily Event Count</Typography>
              <Typography color="success" variant="h6">
                Today:{' '}
                {dailyEventCountStats[dailyEventCountStats.length - 1]!.y || 0}
              </Typography>
            </div>
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={20}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={({ datum }) => datum.y}
                  labelComponent={
                    <VictoryTooltip
                      cornerRadius={0}
                      flyoutStyle={{
                        fill: 'white',
                      }}
                    />
                  }
                />
              }
            >
              <VictoryAxis
                dependentAxis
                style={{
                  axisLabel: {
                    fontSize: 100,
                    padding: 30,
                  },
                }}
                tickFormat={(x) => `${x / 1000}k`}
              />
              <VictoryAxis // label="Label"
                tickFormat={(x) => `${x}`.slice(0, -4) + `${x}`.slice(-2)}
                style={{
                  // axis: { stroke: '#756f6a' },
                  axisLabel: {
                    fontSize: 10,
                    padding: 30,
                  },
                  tickLabels: {
                    angle: 45,
                  },
                }}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: '#1ADACE',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventCountStats}
              />
            </VictoryChart>
            <Typography variant="caption">
              Only tracking event kinds: 0,2,3
            </Typography>
          </Stack>
        </CardContainer>

        <CardContainer>
          <Stack direction="column" className="text-center">
            <div className="h-16">
              <Typography variant="h5">Daily Event Count By Kind</Typography>
            </div>
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={20}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={({ datum }) => datum.y}
                  labelComponent={
                    <VictoryTooltip
                      cornerRadius={0}
                      flyoutStyle={{
                        fill: 'white',
                      }}
                    />
                  }
                />
              }
            >
              <VictoryAxis
                dependentAxis
                style={{
                  axisLabel: {
                    fontSize: 100,
                    padding: 30,
                  },
                }}
                tickFormat={(x) => `${x / 1000}k`}
              />
              <VictoryAxis // label="Label"
                tickFormat={(x) => `${x}`.slice(0, -4) + `${x}`.slice(-2)}
                style={{
                  // axis: { stroke: '#756f6a' },
                  axisLabel: {
                    fontSize: 10,
                    padding: 30,
                  },
                  tickLabels: {
                    angle: 45,
                  },
                }}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: '#1ADACE',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventsByKindStats[0]}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: '#c43a31',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventsByKindStats[1]}
              />
              <VictoryLine
                style={{
                  data: {
                    stroke: 'black',
                  },
                  parent: {
                    border: '1px solid #ccc',
                  },
                }}
                data={dailyEventsByKindStats[2]}
              />
              <VictoryLegend
                x={0}
                y={10}
                orientation="horizontal"
                gutter={20} // style={{ border: { stroke: 'black' } }}
                colorScale={['#1ADACE', '#c43a31', 'black']}
                data={[
                  {
                    name: 'kind0',
                  },
                  {
                    name: 'kind2',
                  },
                  {
                    name: 'kind3',
                  },
                ]}
              />
            </VictoryChart>
          </Stack>
        </CardContainer> */}
      </Stack>
    </>
  );
}
