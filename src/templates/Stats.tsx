import { Stack, Card, Typography } from '@mui/material';
import {
  VictoryChart,
  VictoryTheme,
  VictoryLine,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryAxis,
  VictoryLegend,
} from 'victory';

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

export function Stats({
  cumulativePubKeyStats,
  dailyEventCountStats,
  dailyEventsByKindStats,
}: any) {
  return (
    <>
      <Stack
        spacing={5}
        direction={{ xs: 'column', lg: 'row' }}
        className="!content-evenly !items-center mb-4"
      >
        <CardContainer>
          <Stack direction="column" className="text-center">
            <div className="h-16">
              <Typography variant="h5">Total Number of Public Keys</Typography>
              <Typography color="success" variant="h6">
                {cumulativePubKeyStats[cumulativePubKeyStats.length - 1]!.y ||
                  0}
              </Typography>
            </div>
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={10} // padding={{ left: 60 }}
              widht={100}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="xl"
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
                tickFormat={(x) => `${x}`.slice(0, -5)}
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
                x={125}
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
              <Typography variant="h5">Total Number of Public Keys</Typography>
              <Typography color="success" variant="h6">
                {cumulativePubKeyStats[cumulativePubKeyStats.length - 1]!.y ||
                  0}
              </Typography>
            </div>
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={10} // padding={{ left: 60 }}
              widht={100}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="xl"
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
                tickFormat={(x) => `${x}`.slice(0, -5)}
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
                x={125}
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
        </CardContainer>
      </Stack>
    </>
  );
}
