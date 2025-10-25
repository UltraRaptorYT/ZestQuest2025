import supabase from "@/lib/supabase";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScoreboardProps = {
  isAdmin?: boolean;
  hideAdmin?: string;
};

export default function Scoreboard({
  isAdmin = false,
  hideAdmin = "false",
}: ScoreboardProps) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [frozenTime, setFrozenTime] = useState<Date>(new Date());

  async function updateFrozenState() {
    const { error } = await supabase
      .from("zestquest_25_state")
      .update({ value: !isFrozen, time_updated: new Date() })
      .eq("state", "freeze")
      .select();
    setIsFrozen((prev) => !prev);
    if (error) {
      console.log(error);
      return;
    }
  }
  async function getFrozenState() {
    const { data, error } = await supabase
      .from("zestquest_25_state")
      .select()
      .eq("state", "freeze");
    if (error) {
      console.log(error);
      return;
    }
    if (data.length) {
      setIsFrozen(data[0].value == "true");
      setFrozenTime(data[0].time_updated);
    }
  }

  useEffect(() => {
    getFrozenState();
  }, []);

  useEffect(() => {
    if (!frozenTime) {
      return;
    }
    console.log(frozenTime, "HI");
    async function getTeamName() {
      const { data, error } = await supabase
        .from("zestquest_25_team")
        .select("*")
        .order("letter", { ascending: true });
      if (error) {
        console.log(error);
        return;
      }
      return data;
    }

    async function getLeaderboard() {
      let teamName = await getTeamName();
      if (!teamName) {
        return "ERROR";
      }
      const { data, error } = await supabase.from("zestquest_25_score").select();
      if (error) {
        console.log(error);
        return error;
      }
      let scoreData = [...data];
      console.log(scoreData, "hi");
      if (isFrozen) {
        scoreData = scoreData.filter((e) => {
          return new Date(e.created_at) <= new Date(frozenTime);
        });
        console.log("FROZEN");
        console.log(scoreData, frozenTime);
      }
      for await (let score of scoreData) {
        if (
          "score" in
          teamName.filter((e) => {
            return e.letter == score.team_id;
          })[0]
        ) {
          teamName.filter((e) => {
            return e.letter == score.team_id;
          })[0].score += score.score;
        } else {
          teamName.filter((e) => {
            return e.letter == score.team_id;
          })[0].score = score.score;
        }
      }
      console.log(teamName);
      let newData = teamName.map((e) => {
        if (!("score" in e)) {
          e.score = 0;
        }
        return e;
      });
      newData.sort((a, b) => b.score - a.score);
      setLeaderboard(newData);
    }
    getLeaderboard();
    supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "zestquest_25_score" },
        async (payload) => {
          console.log("Change received!", payload);
          await getLeaderboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "zestquest_25_state" },
        async (payload) => {
          console.log("Change received!", payload);
          await getFrozenState();
        }
      )
      .subscribe();
  }, [frozenTime]);

  return (
    <div className="w-full h-full flex flex-col justify-start items-center">
      {isAdmin && (
        <div
          className={cn(
            "fixed bottom-3 right-3",
            hideAdmin == "false" ? "opacity-100" : "opacity-0"
          )}
        >
          <Button onClick={() => updateFrozenState()}>
            {isFrozen ? "Unfreeze" : "Freeze"} Leaderboard
          </Button>
        </div>
      )}
      <div className="h-fit">
        <h1 className="text-3xl text-center flex flex-col gap-2 font-bold pt-2">
          <span>ZestQuest 2024</span>
        </h1>
        <div className="text-center italic text-sm h-5">
          <span>{isFrozen ? "Leaderboard Frozen" : ""}</span>
        </div>
        <div className="flex justify-center items-stretch h-[190px]">
          <div className="p-0 h-full flex">
            <div
              className="bg-[#dc3c3c] trapShadow w-[104px] h-[75px] mt-auto flex flex-col justify-center items-center relative"
              id="second"
            >
              {leaderboard[1] && (
                <>
                  <img
                    src={leaderboard[1].selfie}
                    className="aspect-square w-14 absolute -top-[calc(3.5rem+10px)] border-4 border-[#adc3d1] rounded-full"
                  />
                  <p className="font-bold text-sm name text-black">
                    {leaderboard[1].team_name}
                  </p>
                  <p className="font-bold text-[#adc3d1] points">
                    {leaderboard[1].score}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="p-0 h-full flex">
            <div
              className="bg-[#fa5353] trapShadow w-[104px] mt-auto  flex flex-col justify-center items-center relative h-[100px]"
              id="first"
            >
              <img
                src="https://hlzsmadaanjcpyjghntc.supabase.co/storage/v1/object/public/zest/crown.png?t=2024-10-31T01%3A31%3A43.145Z"
                className="w-1/3 aspect-square absolute -top-[calc(3.5rem+30px)]"
              />
              {leaderboard[0] && (
                <>
                  <img
                    src={leaderboard[0].selfie}
                    className="aspect-square w-14 absolute -top-[calc(3.5rem+10px)] border-4 border-[#fcd012] rounded-full"
                  />
                  <p className="font-bold text-sm name text-black">
                    {leaderboard[0].team_name}
                  </p>
                  <p className="font-bold text-[#fcd012] points">
                    {leaderboard[0].score}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="p-0 h-full flex">
            <div
              className="bg-[#dc3c3c] trapShadow w-[104px] h-[55px] mt-auto flex flex-col justify-center items-center relative"
              id="third"
            >
              {leaderboard[2] && (
                <>
                  <img
                    src={leaderboard[2].selfie}
                    className="aspect-square w-14 absolute -top-[calc(3.5rem+10px)] border-4 border-[#fbac74] rounded-full"
                  />
                  <p className="font-bold text-sm name text-black">
                    {leaderboard[2].team_name}
                  </p>
                  <p className="font-bold text-[#fbac74] points">
                    {leaderboard[2].score}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 py-2 h-[calc(100dvh-100px-226px-20px-8px-20px)] md:h-[calc(100dvh-68px-254px-20px)] justify-start bg-[#dee2e6] dark:bg-[#23282d] w-full rounded-3xl overflow-y-auto">
        {leaderboard.slice(3).map((e, idx) => {
          return (
            <div className="py-3 flex items-center" key={idx + "Leaderboard"}>
              <div className="flex gap-3 items-center w-full">
                <span className="font-bold text-[#7c7c7c] dark:text-[#cacaca] w-7">
                  {idx + 4}
                </span>
                <img
                  src={e.selfie}
                  className="aspect-square w-12 rounded-full"
                />
                <span className="max-w-32 w-min text-left wrap-break-word whitespace-normal">
                  {e.team_name}
                </span>
                <span className="ml-auto text-base">{e.score}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
