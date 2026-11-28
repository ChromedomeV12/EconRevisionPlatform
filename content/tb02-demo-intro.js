globalThis.EconDemoDraftGraphs = true;
/* TB-02 demo pack. Drafts awaiting human review. */
(() => {
  const data = {
  "pack": {
    "schemaVersion": 1,
    "id": "tb02-demo-intro",
    "title": "TB-02 demo: Introduction",
    "cards": [
      {
        "id": "tb-02-p017-opportunity-cost-on-the-ppc",
        "revision": 1,
        "unit": "intro",
        "topic": "Opportunity cost and curve shape",
        "title": "Slope as opportunity cost",
        "headline": "The gradient of the PPC measures the opportunity cost between the two products.",
        "summary": "The gradient of the curve shows the opportunity cost between the two products in the model. The PPC is typically drawn concave to the origin because of increasing opportunity costs: as the economy takes more of one product, the amount of the other product given up rises.",
        "notes": "The concavity is therefore a statement about cost, not decoration. A curve bending away from the origin means each further transfer of resources costs more of the other product, whereas a straight line would show a constant opportunity cost for each unit transferred. Read the slope together with the axes, since the gradient is measured in units of the vertical product per unit of the horizontal product.",
        "takeaway": "Concave to the origin means rising opportunity cost; a straight line would mean constant cost.",
        "caution": "The gradient is not a price and not a money value; it is a ratio of two physical quantities given up.",
        "related": [
          "tb-02-p017-ppc-model",
          "tb-02-p015-opportunity-cost"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 17
          }
        ],
        "level": "common-core-provisional",
        "graphId": "ocr-tb-02-p17-2da169ca225a"
      },
      {
        "id": "tb-02-p017-ppc-model",
        "revision": 1,
        "unit": "intro",
        "topic": "Production possibility curve",
        "title": "Reading the PPC",
        "headline": "The PPC shows the maximum combinations an economy can produce efficiently.",
        "summary": "The production possibility curve diagrams the maximum combination of two products an economy can produce at a point in time when resources are used efficiently, so it pictures productive capacity. A point inside the curve means resources are not being used efficiently, a point outside is not attainable with current resources and technology, and the downward slope means gaining one product requires forgoing some of the other.",
        "notes": "Reading a point on the curve gives a combination, not a total: the book's Figure 1.4 shows the economy at point X, producing the quantity marked A of producer goods and the quantity marked B of consumer goods. The three positions do different jobs, which is why they are easy to mix up. On the curve is efficient use of the available capacity, inside is underuse such as unemployment of resources, and beyond is unattainable until capacity or technology changes.",
        "takeaway": "On the curve is attainable and efficient, inside is attainable but wasteful, beyond is unattainable.",
        "caution": "A point on the curve does not say which combination is best for society; it only says the combination is productively efficient.",
        "related": [
          "tb-02-p017-ppc-assumptions",
          "tb-02-p017-opportunity-cost-on-the-ppc"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 17
          }
        ],
        "level": "common-core-provisional",
        "graphId": "ocr-tb-02-p17-2da169ca225a"
      },
      {
        "id": "tb-02-p022-logic-and-rational-choice",
        "revision": 1,
        "unit": "intro",
        "topic": "Economic methodology",
        "title": "Why economics reasons instead of relying on feelings",
        "headline": "Positive economics builds on logic and on an assumption that people choose rationally to maximise well-being.",
        "summary": "Logic means explaining how the economy and policy work through rationality and reasoning rather than through feelings, emotions or beliefs. It is central to positive economics, which needs claims that can be examined and tested. From that base the method assumes people weigh the information available to them and make rational choices that maximise their economic well-being.",
        "notes": "This is a methodological stance, not a description of each decision people actually make. Treating people as rational maximisers is what lets economists turn reasoning into predictions about demand, incentives and policy responses that can then be checked against evidence. The page presents the rational-choice assumption as a logical starting point for analysis, so its purpose is to make behaviour analysable, not to claim that emotions and beliefs play no part in the real world.",
        "takeaway": "Logic supplies the reasoning, and the rational-choice assumption supplies a predictable model of behaviour that evidence can then test.",
        "caution": "Rational choice is an assumption the method adopts to reason with, not proof that each person behaves that way in practice.",
        "related": [
          "tb-02-p022-positive-versus-normative"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 22
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      },
      {
        "id": "tb-02-p022-positive-versus-normative",
        "revision": 1,
        "unit": "intro",
        "topic": "Economic methodology",
        "title": "Statements you can test and statements you can only argue",
        "headline": "Positive economics studies what is; normative economics studies what should be.",
        "summary": "Economic methodology splits how economists reason into two dimensions. Positive economics describes the economy as it actually works and deals in objective, factual claims that evidence can verify or refute. Normative economics asks how the economy ought to work, so it rests on values and judgements rather than on facts alone. The page attributes this pairing to John Neville Keynes.",
        "notes": "The dividing line is what kind of claim is being made, not who makes it or how confident they sound. A positive statement about unemployment or tobacco demand can be checked against data and can turn out wrong; a normative statement about what policy should do cannot be settled by evidence alone because it depends on what someone thinks ought to happen. Positive claims rely on reasoning, logic and empirical evidence, which is why testing them is meaningful. Many real sentences mix the two, blending a testable prediction with a value judgement about whether the outcome is desirable.",
        "takeaway": "Positive statements can be tested against evidence; normative statements express what should be and depend on values.",
        "caution": "Positive does not mean correct. A positive statement is merely testable, so it can be verified or refuted rather than assumed true.",
        "related": [
          "tb-02-p012-economics-as-social-science"
        ],
        "sources": [
          {
            "id": "TB-02",
            "page": 22
          }
        ],
        "level": "common-core-provisional",
        "graphId": null
      }
    ]
  },
  "graphs": {
    "ocr-tb-02-p17-2da169ca225a": {
      "version": 1,
      "id": "ocr-tb-02-p17-2da169ca225a",
      "title": "Reconstruction fig-1-4-v2",
      "description": "Production possibility curve bowing out from the producer-goods axis to the consumer-goods axis, with point X on the curve and dashed guides to 'Producer A goods' on the vertical axis and B on the horizontal axis.",
      "coordinateMode": "schematic",
      "axes": {
        "x": {
          "label": "Consumer good",
          "min": 0,
          "max": 100
        },
        "y": {
          "label": "Producer A goods",
          "min": 0,
          "max": 100
        },
        "aspectRatio": 1.5
      },
      "curves": [
        {
          "id": "ppc",
          "label": "PPC",
          "role": "ppc",
          "shape": "piecewise",
          "labelPosition": [
            92,
            30
          ],
          "points": [
            [
              0,
              89.1
            ],
            [
              5,
              88.8
            ],
            [
              9.6,
              88.3
            ],
            [
              14.2,
              87.5
            ],
            [
              18.8,
              86.4
            ],
            [
              23.4,
              85.1
            ],
            [
              28.1,
              83.4
            ],
            [
              32.7,
              81.4
            ],
            [
              37.3,
              78.8
            ],
            [
              41.9,
              76
            ],
            [
              46.5,
              72.8
            ],
            [
              51.1,
              69.2
            ],
            [
              55.8,
              65
            ],
            [
              60.4,
              60.2
            ],
            [
              63,
              57.3
            ],
            [
              65,
              54.9
            ],
            [
              70.8,
              46.6
            ],
            [
              72.8,
              43.4
            ],
            [
              74.6,
              40.2
            ],
            [
              76.3,
              37
            ],
            [
              77.8,
              33.8
            ],
            [
              79.2,
              30.6
            ],
            [
              80.4,
              27.4
            ],
            [
              82.6,
              21
            ],
            [
              84.1,
              14.6
            ],
            [
              85.5,
              5.1
            ],
            [
              85.9,
              0
            ]
          ]
        }
      ],
      "points": [
        {
          "id": "x",
          "label": "X",
          "curve": "ppc",
          "x": 63,
          "y": 57.3,
          "xLabel": "B",
          "labelPosition": [
            66.4,
            65.5
          ],
          "marker": true
        }
      ],
      "guides": [
        {
          "point": "x",
          "axes": [
            "x",
            "y"
          ]
        }
      ],
      "arrows": [],
      "areas": [],
      "labels": [
        {
          "text": "0",
          "x": 0,
          "y": 0
        }
      ],
      "review": {
        "status": "draft",
        "reviewer": null
      }
    }
  }
};
  globalThis.EconPublished ||= { packs: [], graphs: {} };
  EconPublished.packs.push(data.pack);
  Object.assign(EconPublished.graphs, data.graphs);
})();
