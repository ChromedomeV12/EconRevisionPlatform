/* TB-02 demo pack. Drafts awaiting human review. */
(() => {
  const data = {
  "pack": {
    "schemaVersion": 1,
    "id": "tb02-demo-macro",
    "title": "TB-02 demo: Macroeconomics",
    "cards": [
      {
        "id": "tb-02-p118-three-approaches",
        "revision": 1,
        "unit": "macro",
        "topic": "National income accounting",
        "title": "Income, output and expenditure approaches",
        "headline": "Income, output and expenditure are three routes to the same national total.",
        "summary": "National income accounting measures the monetary value of goods and services produced in a country during a year, usually as GDP, which counts output within the nation including foreign multinationals there. The income method sums wages, rent, interest and profit. The output method values final goods and services. The expenditure method sums C + I + G + (X - M). In theory output, income and expenditure are equal.",
        "notes": "The three approaches are three views of the same circular flow: one person's spending is another's income and corresponds to output produced. GDP is defined by territory, so output of foreign multinationals inside the country is included, which distinguishes it from a measure based on residents' earnings abroad. Real-world discrepancies arise from inaccuracies and differences in data collection, not from a failure of the identity. Consumption is the single largest component of national expenditure, and investment here means firms' spending to increase capital stock, sometimes called gross fixed capital formation.",
        "takeaway": "O = Y = E in theory: output, income and expenditure are three routes to the same national total.",
        "caution": "GDP counts output produced within the country, including foreign firms' local output; it is not a measure of residents' incomes from anywhere.",
        "related": [
          "tb-02-p115-circular-flow"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 118
          }
        ],
        "level": "hl-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p119-gdp-exclusions",
        "revision": 1,
        "unit": "macro",
        "topic": "National income accounting",
        "title": "Transfer payments and double counting",
        "headline": "GDP excludes transfer payments because they produce no output, and counts only final output to avoid double counting.",
        "summary": "Transfer payments such as unemployment benefits and state pensions are excluded from government expenditure when GDP is calculated, because no corresponding output is generated. Only the value of final goods and services is included, which prevents double counting: the value of manufactured products sold to retailers is not counted again when the retailer sells them. These conventions keep GDP a measure of output produced.",
        "notes": "A transfer payment moves purchasing power between people without adding to production, so counting it as government spending would overstate GDP; the spending it finances may still count when the recipient buys output. The final-output rule means intermediate sales within the production chain are excluded, and the retailer's sale contributes only its own value added. Both conventions belong to the expenditure approach, which otherwise sums consumption, investment, government spending and net exports. The circular flow on this page also states that equilibrium national income occurs when withdrawals equal injections and that Y = O = E.",
        "takeaway": "No new output, no GDP: transfer payments are excluded, and only final sales are counted.",
        "caution": "Government spending in GDP is not the same as all government payments to households.",
        "related": [
          "tb-02-p118-three-approaches"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 119
          }
        ],
        "level": "hl-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p128-ad-curve",
        "revision": 1,
        "unit": "macro",
        "topic": "Aggregate demand",
        "title": "What the AD curve shows",
        "headline": "The aggregate demand curve shows planned spending on domestic output at each average price level, and it slopes downward.",
        "summary": "Aggregate demand is the value of total demand for all goods and services in an economy per time period: the planned spending on domestically produced goods and services at different average price levels. On a diagram with the average price level on the vertical axis and real GDP on the horizontal axis, the AD curve slopes downward, so a higher average price level goes with a lower level of aggregate demand, other things equal.",
        "notes": "The page's explanation is a purchasing-power channel: when the average price level falls, individuals, households, firms and the government can buy more with a given amount of money, so consumption, investment and government spending rise, ceteris paribus. That is why the slope is a claim about spending across the whole economy rather than about one market's demand. The ceteris paribus clause matters: the curve relates the price level to planned spending with everything else held constant, so the slope should not be read as a list of every influence on spending. Figure 17.1 carries no tick marks or numeric scale, so only the direction of the relationship can be read from it, not magnitudes. The page's top tip warns against carrying micro labels into macro diagrams: use 'average price level' (or 'general price level') and 'Real GDP' (or 'National output'), not 'price' and 'quantity'.",
        "takeaway": "AD slopes down because a lower price level raises the purchasing power behind C, I and G, not because one good became cheaper.",
        "caution": "Labelling AD-AS axes 'price' and 'quantity' is a micro slip; macro diagrams take average price level and real GDP.",
        "related": [
          "tb-02-p118-three-approaches",
          "tb-02-p115-circular-flow"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 128
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p128-investment-definition",
        "revision": 1,
        "unit": "macro",
        "topic": "Aggregate demand",
        "title": "Investment means capital goods",
        "headline": "Investment is firms' spending on capital goods that raises the capital stock and productive capacity, not household saving.",
        "summary": "The page defines investment (I) as the expenditure of firms on capital goods in order to increase their capital stock and productive capacity, such as machinery, tools, capital equipment, commercial vehicles and industrial buildings. Investment is one of the five components of aggregate demand, alongside consumption expenditure, government spending, export earnings and import expenditure; consumption is the single largest of these components.",
        "notes": "The definition turns on what the spending buys: new capital goods add to what the economy can produce, so machinery, equipment, vehicles and industrial buildings qualify. Placing money in a savings account or buying an existing financial asset is a transfer of funds between holders, not the creation of capital goods, so it does not fit this definition. The same five components appear in the expenditure measure of GDP, where the term enters as C + I + G + (X - M); the AD card uses the same list from the demand side, which is why the two are related rather than separate formulas.",
        "takeaway": "In this chapter investment is firms' capital-goods spending, not the act of saving or buying financial assets.",
        "caution": "A household deposit or a share purchase is not investment in this macro sense; it creates no new capital goods.",
        "related": [
          "tb-02-p118-three-approaches",
          "tb-02-p128-ad-curve"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 128
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p141-growth-definition",
        "revision": 1,
        "unit": "macro",
        "topic": "Economic growth",
        "title": "What economic growth measures",
        "headline": "Economic growth is a rise in real GDP over time, usually reported as an annual percentage change.",
        "summary": "Growth compares national output across periods, so it is measured with real GDP, which is adjusted for inflation rather than recorded at current prices. A fall in real GDP is negative growth, associated with a recession in the business cycle. Because higher output is presented as the most practical route to a higher material standard of living for most people, sustained growth is treated as a central macroeconomic objective.",
        "notes": "Real GDP is the inflation-adjusted value of the goods and services produced within a country in a period, usually a year, so a rise in money GDP caused only by higher prices is not growth. Over the longer run, growth also depends on more or better factors of production, such as improved labour productivity or advances in technology, which push out the economy's production possibilities. The page lists growth first among the macroeconomic objectives; the standard-of-living claim is a general argument, while distributional and environmental limits of using GDP are treated separately in the course.",
        "takeaway": "Growth is a real increase in output, not a rise in prices.",
        "caution": "A higher nominal GDP does not by itself establish economic growth; the effect of price changes must be removed first.",
        "related": [
          "tb-02-p120-nominal-real",
          "tb-02-p018-growth-two-routes"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 141
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p142-real-growth-rate",
        "revision": 1,
        "unit": "macro",
        "topic": "Economic growth",
        "title": "Adjusting a growth rate for inflation",
        "headline": "Real economic growth is roughly nominal growth minus inflation, so 5% nominal and 3% inflation means about 2% real.",
        "summary": "Economic growth is usually measured from changes in GDP over time. Nominal growth is the annual rate of change in money terms, so it mixes extra output with higher prices. Real growth adjusts that rate for inflation and therefore reflects the true change in goods and services produced. In the page's example, nominal GDP rises 5 per cent while average prices rise 3 per cent, leaving real growth of approximately 2 per cent.",
        "notes": "The subtraction is an approximation for small rates; a precise calculation deflates the GDP levels instead, dividing nominal GDP by a price index before comparing periods. Keep the units clear: the two percentages describe rates of change over the same period, not price levels. A country can post healthy nominal growth while real output barely moves if inflation is high, which is why comparisons of living standards over time use real growth.",
        "takeaway": "Subtract inflation from nominal growth to estimate real growth.",
        "caution": "Nominal growth overstates real growth whenever prices are rising; treating 5 per cent money growth as 5 per cent more output is wrong.",
        "related": [
          "tb-02-p141-growth-definition",
          "tb-02-p120-nominal-real"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 142
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p146-low-unemployment-objective",
        "revision": 1,
        "unit": "macro",
        "topic": "Macroeconomic objectives",
        "title": "Why governments target low unemployment",
        "headline": "Low unemployment supports growth, living standards and the public finances while limiting the loss of skilled workers abroad.",
        "summary": "The page gives five linked reasons to target low unemployment. Employed people earn and spend, so employment reinforces growth. Jobs raise well-being and average living standards. Higher income and spending taxes give government revenue for education, healthcare and infrastructure. Fewer unemployment benefits are needed, easing the burden on taxpayers. Skilled workers are less likely to emigrate for work, avoiding a brain drain.",
        "notes": "The arguments overlap rather than stack independently: higher employment raises income, which raises spending, tax revenue and output, so the growth and fiscal arguments share a mechanism. Treat the list as a set of channels to explain, not five separate proofs. The brain-drain point is the least general: it depends on how mobile skilled labour is and on whether good jobs exist domestically. Where you apply the objective to a real economy, name the channel you are using instead of asserting that all five follow automatically.",
        "takeaway": "Unemployment is costly in output, well-being, tax revenue and welfare spending, so the gains from low unemployment run in several directions at once.",
        "caution": "Do not claim low unemployment alone guarantees higher living standards. Growth can widen inequality and damage the environment, so the distribution and composition of the extra output still matter.",
        "related": [
          "tb-02-p146-unemployment-definition",
          "tb-02-p143-growth-living-standards"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 146
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p146-minimum-wage-real-wage-unemployment",
        "revision": 1,
        "unit": "macro",
        "topic": "Unemployment",
        "title": "Minimum wage and real wage unemployment",
        "headline": "A minimum wage held above the equilibrium real wage creates real wage unemployment.",
        "summary": "On Figure 19.1 the labour market clears at real wage We, where demand for labour DL equals supply SL and 15 million jobs are filled. A minimum wage set at Wm sits above that equilibrium. At Wm, firms want 10 million workers while 20 million people offer their labour, so the horizontal gap between those quantities is unemployment. Real wage unemployment is therefore caused by the wage being held above its market level rather than by too little demand at the equilibrium wage.",
        "notes": "Read the diagram in three steps. First find the free-market outcome: where DL and SL cross, at We and 15 million. Second, draw the binding minimum wage above it, at Wm. Third, follow Wm across to each curve: the demand curve gives 10 million jobs, the supply curve gives 20 million people seeking work, and the difference of 10 million is the unemployment the page shades between the dashed guides. Because the wage cannot fall to We, the labour market does not clear. The textbook prints lettered labels A to F around the wage bands but does not define them on the page, so read the outcome from the labelled curves and quantities rather than from the letters.",
        "takeaway": "With a binding minimum wage, employment is read off the demand curve at Wm, not off the equilibrium crossing.",
        "caution": "The diagram assumes a single competitive labour market and a minimum wage that actually binds. It is not evidence that every minimum wage raises unemployment in every labour market, and it does not model enforcement, coverage or employer responses.",
        "related": [
          "tb-02-p146-unemployment-definition"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 146,
            "figure": "19.1"
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p152-cpi-base-year",
        "revision": 1,
        "unit": "macro",
        "topic": "Inflation",
        "title": "Reading a price index from its base year",
        "headline": "A price index is read against a base year set at 100, so an index of 115.2 means prices are 15.2% higher than in the base year.",
        "summary": "The consumer price index is a weighted index of average consumer prices over time and is the usual measure of inflation and of changes in the cost of living. Its base year carries an index number of 100, so any later index value states the percentage change in average prices since that base. If the index moves from 115.2 to 120.96 after a further 5% rise, prices are 20.96% above the base year. Changes in the index give the inflation rate, not the index level itself.",
        "notes": "Two arithmetic habits prevent most errors here. First, the index is always read relative to 100, so 115.2 is 15.2% above the base, not 115.2%. Second, successive percentage increases compound: multiplying 115.2 by 1.05 gives 120.96, which is not the same as adding five points. The page's example therefore produces 20.96% over the whole period, not 20%. When you are given an index and asked for the inflation rate between two years, use the percentage change between those two index values, and state the base-year convention when quoting a level.",
        "takeaway": "Index level measures the change since the base year; inflation is the percentage change between two index values.",
        "caution": "Do not report an index number as though it were a percentage change, and do not add percentage changes across periods. Compounding applies.",
        "related": [
          "tb-02-p152-inflation-definition",
          "tb-02-p152-cpi-weights"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 152
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p152-cpi-weights",
        "revision": 1,
        "unit": "macro",
        "topic": "Inflation",
        "title": "Why the CPI is weighted",
        "headline": "CPI weights show how important each item is to the average household, and are revised as spending patterns change.",
        "summary": "The CPI applies statistical weights to reflect each item's relative importance in the representative list of goods and services bought by a typical household. The page gives two ways to set them: by the volume of quantities purchased, assuming more frequent or larger purchases matter more, or by the value of spending, so an item taking a larger share of the family budget gets a larger weight. Weights are revised periodically as household spending changes.",
        "notes": "A weighted index answers a different question from a simple average of prices: it tracks the cost of the basket households actually buy, so a big rise in a small item matters less than a modest rise in rent. Revision of the weights is what keeps the index representative, since a basket fixed for decades would overstate the importance of goods households have stopped buying. The page also reminds students that services belong in the basket: describing the CPI as a basket of goods alone leaves out part of the calculation. This page does not give the full index formula; the calculation practice concerns using quantities purchased as weights.",
        "takeaway": "Weights turn a list of prices into a cost-of-living measure, and they must be updated as spending patterns shift.",
        "caution": "Do not treat the CPI as an unweighted average of prices, or as a goods-only basket. Weights and services are both part of how it is built.",
        "related": [
          "tb-02-p152-cpi-base-year",
          "tb-02-p152-inflation-definition"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 152
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p163-budget-deficit-versus-debt",
        "revision": 1,
        "unit": "macro",
        "topic": "Fiscal policy",
        "title": "Deficit is a flow, debt is a stock",
        "headline": "A budget deficit is one period's gap between government spending and tax revenue; government debt is the sum of past deficits.",
        "summary": "A budget deficit exists when the value of government spending exceeds its revenue in a time period, that is, G > T. Government debt is the accumulation of the government's budget deficits from previous years: the total owed to domestic and foreign creditors such as commercial banks, the IMF and the World Bank. Each year a deficit is run, the deficit adds to the debt, so the two move together. A deficit can shrink while the debt is still large.",
        "notes": "Keep the units straight. The deficit is measured per time period, so it is a flow: in a given year the government spent more than it collected. The debt is a stock measured at a point in time: what is still owed after earlier borrowing. The sentences are linked but not interchangeable, because a government can balance its budget today and still carry a large debt from earlier years, and it can repay part of the debt in a year when it avoids a deficit. The textbook gives pandemic support spending as an example of a deficit that increases national debt.",
        "takeaway": "A deficit changes the debt; the debt records every past deficit.",
        "caution": "Saying the debt 'fell because the deficit fell' confuses the flow with the stock. The debt falls only when borrowing is repaid or retired.",
        "related": [],
        "sources": [
          {
            "id": "TB-02",
            "page": 163
          }
        ],
        "level": "hl-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p163-debt-to-gdp-ratio",
        "revision": 1,
        "unit": "macro",
        "topic": "Fiscal policy",
        "title": "Debt measured against GDP",
        "headline": "Debt is judged affordable by the debt-to-GDP ratio, so the same debt looks worse in a smaller economy.",
        "summary": "The main way to measure government debt is to express it as a percentage of GDP, which is the debt-to-GDP ratio. The ratio shows the share of a year's national income that the government owes to its creditors. The higher the ratio, the more unaffordable the debt is treated as being. Because the denominator is annual national income, the ratio can improve either when debt falls or when GDP grows.",
        "notes": "The ratio is a comparison of a stock with an annual flow, so it answers a different question from the absolute debt figure. A debt of a given size is a lighter burden in an economy that produces more income each year, and the same debt becomes harder to service if national income falls. That is why the textbook uses the ratio as the test of affordability and sustainability rather than the debt figure alone.",
        "takeaway": "Affordability depends on debt relative to the income available to service it.",
        "caution": "A rising debt-to-GDP ratio is not automatically a crisis: it can reflect either faster borrowing or a shrinking economy, and the two call for different responses.",
        "related": [],
        "sources": [
          {
            "id": "TB-02",
            "page": 163
          }
        ],
        "level": "hl-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p166-conflicting-macro-objectives",
        "revision": 1,
        "unit": "macro",
        "topic": "Macroeconomic objectives",
        "title": "Objectives that pull against each other",
        "headline": "A government cannot reach every macroeconomic objective at once, so it must decide which aim matters most.",
        "summary": "It is not always possible for a government to achieve its macroeconomic objectives simultaneously, because the goals conflict. The page names four potential conflicts: low unemployment against low inflation, high growth against low inflation, high growth against environmental sustainability, and high growth against equity in income distribution. Because the aims compete, the government must prioritise which objective matters most at that time.",
        "notes": "Read the list as a set of trade-offs rather than a claim that growth is bad. Each pair uses the same instrument, growth or demand, to pursue one aim while making another harder: faster growth supports employment but strains prices, resources and the distribution of the gains. Prioritising is therefore a policy decision about which cost the government is willing to accept now, not a technical solution that removes the conflict. The page states the choice without ranking the objectives for the government.",
        "takeaway": "Objective conflicts turn macroeconomic policy into a choice about which aim to sacrifice.",
        "caution": "A trade-off between objectives is a potential conflict, not a law: the next page shows demand and supply can both rise, so growth and low inflation are not always incompatible.",
        "related": [],
        "sources": [
          {
            "id": "TB-02",
            "page": 166
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p166-unemployment-inflation-two-channels",
        "revision": 1,
        "unit": "macro",
        "topic": "Macroeconomic objectives",
        "title": "Why low unemployment strains prices",
        "headline": "Low unemployment threatens low inflation through demand-pull pressure and through wage-driven cost-push pressure.",
        "summary": "Rapid growth brings more people into paid employment, and inflationary pressure is likely once the economy reaches its full employment level of output. The page gives two channels. Demand-pull inflation appears when growth is fuelled by higher aggregate demand, so AD rises faster than AS. Cost-push inflation appears because full employment makes it harder for firms to attract skilled labour, producing wage inflation and higher prices.",
        "notes": "The two channels start from the same labour-market improvement but work differently. In the demand-pull case the pressure comes from spending: output is already near capacity, so extra demand is competed for through prices rather than met by extra output. In the cost-push case the pressure comes from costs: with unemployment low, firms must bid for scarce skilled workers, and higher wages are passed on as higher prices. That is why the low-unemployment objective can pull against the low-inflation objective even when demand growth is not the only cause.",
        "takeaway": "Near full employment, extra demand and scarce skilled labour both push the price level up.",
        "caution": "Wage inflation here is a cost-push mechanism, not proof that workers caused inflation; the trigger is firms competing for scarce skilled labour.",
        "related": [],
        "sources": [
          {
            "id": "TB-02",
            "page": 166
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p171-inequality-dimensions",
        "revision": 1,
        "unit": "macro",
        "topic": "Inequality",
        "title": "Where income gaps appear",
        "headline": "Income inequality is unequal distribution of income, visible between regions, sexes, ages, ethnicities, occupations and countries.",
        "summary": "Economic inequality has two parts: unequal distribution of income and unequal distribution of wealth. Unequal distribution of income exists when a minority of society enjoys a disproportionately high concentration of the nation's income. The page locates the gaps between geographical regions of a country, males and females, age groups, ethnicities and occupations, and adds that income inequalities also exist between countries.",
        "notes": "The comparison is the content of the measure: inequality is not only a single national number but a set of gaps between identified groups, and the same country can look more or less unequal depending on which comparison is made. Unequal distribution of wealth is the second part, covering imbalances in the spread of a country's assets, which are defined as land, buildings, capital resources, savings and financial holdings. Keeping the two parts separate matters because income can be earned while wealth is held, so a group can be close on one measure and far apart on the other.",
        "takeaway": "Inequality is measured as gaps between named groups, on income and on wealth separately.",
        "caution": "A national income distribution can hide wide gaps between regions or groups, so one average figure is not evidence of equal treatment.",
        "related": [],
        "sources": [
          {
            "id": "TB-02",
            "page": 171
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p171-inequality-impacts",
        "revision": 1,
        "unit": "macro",
        "topic": "Inequality",
        "title": "Why inequality is a policy problem",
        "headline": "Large income inequality damages society through household debt, political unrest and slower growth, raising poverty rates.",
        "summary": "A large degree of income inequality tends to have detrimental social, political and economic impacts on a country. The page gives greater household debt, political unrest and slower GDP growth as examples, and says the result can ultimately be higher poverty rates. Because the harm runs through society and the economy together, most governments strive to achieve greater income equality over time.",
        "notes": "The three named impacts show why inequality is treated as more than a distributional detail. Households borrowing more to keep up can carry rising debt; political unrest signals strain in the social settlement; slower GDP growth means the economy loses output as well as fairness. The page then draws the poverty link: these consequences push more people below the poverty line, which reinforces the case for policy. That is a stated tendency, not a claim that every unequal country will follow the same path.",
        "takeaway": "Inequality is a macroeconomic concern because its costs include slower growth and higher poverty.",
        "caution": "The page states a tendency and lists examples; it does not claim that inequality mechanically produces unrest or that growth alone always reduces poverty.",
        "related": [],
        "sources": [
          {
            "id": "TB-02",
            "page": 171
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p184-goals-and-transmission",
        "revision": 1,
        "unit": "macro",
        "topic": "Monetary policy",
        "title": "Five goals and how a rate cut reaches them",
        "headline": "Monetary policy aims at inflation, unemployment, the business cycle, long-term growth and the external balance.",
        "summary": "The stated goals are inflation targeting, meaning a low and stable rate of inflation; low unemployment; reducing fluctuations in the business cycle; promoting a stable economic environment for long-term growth; and harmonizing the external balance, where the value of exports is balanced by the value of imports. The central bank oversees this, raising rates in a boom and lowering them when growth is weak.",
        "notes": "The transmission route on the page runs through borrowing costs. Lower interest rates cut borrowing costs for households and firms, which raises consumption and investment, lifts aggregate demand and should reduce unemployment as real GDP rises. The same lever is used in reverse: higher rates during a boom reduce inflationary pressure, especially near or at full employment. The remaining goals follow from stability, since consumers and firms favour a climate of certainty when investing in physical and human capital. External balance is the odd one out, because it works through the exchange rate rather than through domestic demand alone.",
        "takeaway": "A rate change moves borrowing costs, spending and output, and the same lever is used in both directions.",
        "caution": "The goals can pull against each other, and the page describes intended channels rather than guaranteed outcomes.",
        "related": [
          "tb-02-p184-interest-rates-and-money-supply"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 184
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p184-interest-rates-and-money-supply",
        "revision": 1,
        "unit": "macro",
        "topic": "Monetary policy",
        "title": "Two prices and a quantity",
        "headline": "Interest rates are the price of money, while the money supply is the quantity of money circulating in the economy.",
        "summary": "Interest rates can refer to the price of borrowing money, the rate charged to borrowers, or the return from saving money, the rate paid to savers. The money supply refers to the entire quantity of money circulating in an economy, including bank notes and coins, loans and savings deposits at financial institutions such as commercial banks.",
        "notes": "The interest rate is described as a price, and it has two faces: a cost to a borrower and a reward to a saver. A change in the rate therefore moves households and firms in two directions at once, which is the channel through which monetary policy reaches spending. The money supply is broader than cash in circulation, because loans and savings deposits at commercial banks are counted too. That breadth connects the definition to credit creation, where lending by commercial banks adds to the quantity of money.",
        "takeaway": "One rate sits between borrower and saver, and the money supply counts deposits and loans, not only notes and coins.",
        "caution": "The money supply is not just banknotes and coins; deposits and loans at commercial banks are included.",
        "related": [
          "tb-02-p184-monetary-policy-definition"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 184
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p192-direct-versus-indirect-tax",
        "revision": 1,
        "unit": "macro",
        "topic": "Fiscal policy",
        "title": "Taxes on income and taxes on spending",
        "headline": "Direct taxation falls on incomes, wealth and profits; indirect taxation falls on spending.",
        "summary": "Direct taxation is imposed on the incomes, wealth and profits of individuals and firms, for example taxes on wages and salaries, inheritance and company profits. Indirect taxation is imposed on expenditure on goods and services, such as taxes on the sale of petrol, alcohol and cigarettes.",
        "notes": "The distinction is about the base the tax is levied on, not about who finally bears the cost. The chapter's examples place wages, inheritance and company profits on the direct side and purchases of goods and services on the indirect side. Indirect taxes on imports are also the fiscal tool the chapter links to the external balance.",
        "takeaway": "Direct taxes hit earnings and wealth; indirect taxes hit transactions.",
        "caution": "Both are taxes, but only the indirect kind is levied on expenditure.",
        "related": [
          "tb-02-p192-government-revenue-sources",
          "tb-02-p194-external-balance"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 192
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p192-fiscal-policy-definition",
        "revision": 1,
        "unit": "macro",
        "topic": "Fiscal policy",
        "title": "Taxing and spending to steer demand",
        "headline": "Fiscal policy uses taxation and government expenditure to influence economic activity and the macroeconomic aims.",
        "summary": "Fiscal policy is the use of taxation and government expenditure strategies to influence the level of economic activity and to achieve the macroeconomic aims of low unemployment, sustainable economic growth and low inflation (price stability). It is a demand-side policy: fiscal measures act directly on the level of aggregate demand. Expansionary fiscal policy stimulates AD, while contractionary fiscal policy reduces economic activity.",
        "notes": "The chapter's two aims for the instrument are growth and stability, and it adds a redistributive use: taxation can shift income and wealth to improve overall standards of living. The demand-side label is the key distinction from supply-side policy, which works on productive capacity instead. The same page defines the expansionary and contractionary directions in terms of the direction of aggregate demand, not in terms of the size of the budget balance.",
        "takeaway": "Fiscal policy works through the government's budget, on the demand side of the economy.",
        "caution": "It is taxation and government expenditure together, not taxation alone.",
        "related": [
          "tb-02-p192-government-revenue-sources",
          "tb-02-p193-fiscal-goals"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 192
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p201-capacity-shifts",
        "revision": 1,
        "unit": "macro",
        "topic": "Supply-side policies",
        "title": "Two diagrams for one capacity gain",
        "headline": "A supply-side policy can be shown as a rightward LRAS shift or an outward PPC shift.",
        "summary": "In the LRAS diagram, a supply-side policy shifts long-run aggregate supply from LRAS1 to LRAS2, raising potential output from Yf1 to Yf2. With AD unchanged, the average price level falls from PL1 to PL2. In the PPC diagram, the same capacity increase shifts the curve from PPC1 to PPC2, moving production possibilities from point A to point B and raising the maximum quantities of both goods and services.",
        "notes": "The two diagrams show the same idea at different levels of aggregation. The LRAS panel keeps aggregate demand fixed, so a rightward shift of the vertical supply line lowers the price level. The goods-and-services panel shows the trade-off between goods and services, with axes Goods and Services; A is on the inner curve and B on the outer curve, with dashed guides to x1/y1 and x2/y2. Neither diagram shows the policy instrument itself, only the capacity change it produces.",
        "takeaway": "Rightward LRAS and outward PPC are two views of the same capacity gain.",
        "caution": "A move from A to B is a capacity gain, not a movement along one PPC.",
        "related": [
          "tb-02-p201-supply-side-policy-definition",
          "tb-02-p195-monetarist-critique"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 201,
            "figure": "26.1"
          },
          {
            "id": "TB-02",
            "page": 201,
            "figure": "26.2"
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p201-supply-side-goals",
        "revision": 1,
        "unit": "macro",
        "topic": "Goals of supply-side policy",
        "title": "Five aims of supply-side policy",
        "headline": "Supply-side policy pursues five goals, from long-term growth to innovation incentives.",
        "summary": "The chapter lists five goals: long-term growth by increasing productive capacity; improving competition and efficiency; reducing labour costs and unemployment through labour-market flexibility; reducing inflation to improve international competitiveness; and increasing firms' incentives to invest in innovation by reducing costs.",
        "notes": "The goals are connected rather than independent. More competition and lower labour costs can reduce inflation and improve competitiveness; innovation incentives can raise capacity and growth. The first goal is the one the chapter illustrates with the two capacity figures, because capacity growth is the common thread. The list is the chapter's framing, not a claim that a single policy serves the five goals equally.",
        "takeaway": "Capacity, competition, labour flexibility, competitiveness and innovation.",
        "caution": "Reducing inflation through supply-side measures is not the same mechanism as reducing demand.",
        "related": [
          "tb-02-p201-supply-side-policy-definition",
          "tb-02-p193-fiscal-policy-goals"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 201
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      }
    ]
  },
  "graphs": {}
};
  globalThis.EconPublished ||= { packs: [], graphs: {} };
  EconPublished.packs.push(data.pack);
  Object.assign(EconPublished.graphs, data.graphs);
})();
