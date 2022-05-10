import { useCallback, useEffect, useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  //   faCheckSquare,
  faFile,
  faFolder,
  faFolderOpen,
  //   faMinusSquare,
  //   faPlusSquare,
  //   faSquare,
} from "@fortawesome/free-regular-svg-icons";
import {
  faChevronDown,
  faChevronRight,
  faCheckSquare,
  // faFile,
  // faFolder,
  // faFolderOpen,
  faMinusSquare,
  faPlusSquare,
  faSquare,
} from "@fortawesome/free-solid-svg-icons";
import CheckboxTree from "react-checkbox-tree";

import Link from "../../../components/Link";
import Layout from "../../../components/Layout";
import Button from "../../../components/Button";
import FormBlock from "../../../components/FormBlock";
import ListInput from "renderer/components/ListInput";
import ToggleInput from "renderer/components/ToggleInput";
import FolderOrFilesInput from "../../../components/FolderOrFilesInput";
import ActivityIndicator from "renderer/components/ActivityIndicator";

import Toaster from "../../../utils/toaster";
import { useGamesStore, useSettingsStore } from "../../../utils/stores";
import { globToNodes, TNode } from "renderer/utils/globTree";
import IncludeExcludeActions from "renderer/components/IncludeExcludeActions";

const folderColor = "#ffd970";

type TGameForm = {
  // exePath: string;
  // saves: string;
  saveConfig: TSavesConfig & {
    saveFolder: TFolderOrFilesRaw;
  };
};

const GameSettingsPage = () => {
  const games = useGamesStore((state) => state.games);
  const PLATFORM = useSettingsStore((state) => state.envs.PLATFORM);
  const navigate = useNavigate();
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();

  const [folderContentTree, setFolderContentTree] = useState<TNode[]>([]);
  const [folderCheckedNodes, setFolderCheckedNodes] = useState<string[]>([]);
  const [folderExpandedNodes, setFolderExpandedNodes] = useState<string[]>([]);
  const [isLoadingFolderContent, setIsLoadingFolderContent] = useState(false);

  const [resultContentTree, setResultContentTree] = useState<TNode[]>([]);
  // const [resultCheckedNodes, setResultCheckedNodes] = useState<string[]>([]);
  const [resultExpandedNodes, setResultExpandedNodes] = useState<string[]>([]);
  const [isLoadingResultContent, setIsLoadingResultContent] = useState(false);

  const isEditing = id !== "new";
  const game = id ? games[id] : undefined;

  const icons = useMemo(
    () => ({
      check: <FontAwesomeIcon icon={faCheckSquare} />,
      uncheck: <FontAwesomeIcon icon={faSquare} />,
      halfCheck: <FontAwesomeIcon icon={faCheckSquare} />,
      expandClose: <FontAwesomeIcon icon={faChevronRight} />,
      expandOpen: <FontAwesomeIcon icon={faChevronDown} />,
      expandAll: <FontAwesomeIcon icon={faPlusSquare} />,
      collapseAll: <FontAwesomeIcon icon={faMinusSquare} />,
      parentClose: <FontAwesomeIcon icon={faFolder} color={folderColor} />,
      parentOpen: <FontAwesomeIcon icon={faFolderOpen} color={folderColor} />,
      leaf: <FontAwesomeIcon icon={faFile} color={theme.white} />,
    }),
    []
  );

  const { control, watch, handleSubmit, register, setValue } =
    useForm<TGameForm>({
      defaultValues: {
        saveConfig: {
          saveFolder: {
            path: "C:\\Users\\Ciber\\AppData\\LocalLow\\Team Cherry\\Hollow Knight",
          },
          saveFullFolder: true,
          includeList: [],
          excludeList: [],
          ...game?.savesConfig?.[PLATFORM],
        },
        // exePath: JSON.stringify(game?.exePath || { path: undefined }),
        // TODO: перепридумать FileInput, должен ли он в таком же виде оставаться
        // нужно ли platform брать из стора мб в config запихать
        // saves: JSON.stringify(
        //   game?.saveFilesOrFolder?.[PLATFORM]?.path || { path: undefined }
        // ),
      },
    });

  const saveFolderWatch = watch("saveConfig.saveFolder");
  const saveFullFolderWatch = watch("saveConfig.saveFullFolder", true);
  const includeListWatch = watch("saveConfig.includeList", []);
  const excludeListWatch = watch("saveConfig.excludeList", []);
  // "saveConfig.includeList",
  // "saveConfig.excludeList",

  const getContentTree = useCallback(
    async (
      path: string,
      includeList: string[] = [],
      excludeList: string[] = [],
      setLoading: (loading: boolean) => void
    ): Promise<TNode[] | undefined> => {
      try {
        setLoading(true);
        let globbyRes = await window.electron.getGlobby({
          path,
          includeList,
          excludeList,
        });
        // console.log({ globbyRes });
        const newTree = globToNodes(globbyRes);
        // console.log({ newTree });
        return newTree;
      } catch (err) {
        console.error(err);
        // @ts-ignore
        Toaster.add({ intent: "error", message: err });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateFormValues = useCallback(async () => {
    const path = saveFolderWatch?.path;
    const saveFullFolder = saveFullFolderWatch;
    const includeList = includeListWatch;
    const excludeList = excludeListWatch;

    if (!path) return;

    const newFolderContentTree = await getContentTree(
      path,
      ["**/*"],
      [],
      setIsLoadingFolderContent
    );
    console.log({ newFolderContentTree });
    if (newFolderContentTree) {
      setFolderContentTree(newFolderContentTree);
    }

    const newResultContentTree = await getContentTree(
      path,
      [...(saveFullFolder ? ["**/*"] : []), ...includeList],
      excludeList,
      setIsLoadingResultContent
    );
    console.log({ newResultContentTree });
    if (newResultContentTree) {
      setResultContentTree(newResultContentTree);
    }
  }, [
    saveFolderWatch,
    saveFullFolderWatch,
    includeListWatch,
    excludeListWatch,
    setFolderContentTree,
    setIsLoadingFolderContent,
    setResultContentTree,
    setIsLoadingResultContent,
  ]);

  const onClickInclude = (keys: string[]) => () => {
    const newList = [...new Set([...keys, ...includeListWatch])];
    setValue("saveConfig.includeList", newList);
    setFolderCheckedNodes([]);
  };

  const onClickExclude = (keys: string[]) => () => {
    console.log({ folderCheckedNodes });
    const newList = [...new Set([...keys, ...excludeListWatch])];
    setValue("saveConfig.excludeList", newList);
    setFolderCheckedNodes([]);
  };

  const onClickRemoveInclude = (key: string) => {
    const newList = [
      ...new Set([...includeListWatch.filter((k) => k !== key)]),
    ];
    setValue("saveConfig.includeList", newList);
  };

  const onClickRemoveExclude = (key: string) => {
    const newList = [
      ...new Set([...excludeListWatch.filter((k) => k !== key)]),
    ];
    setValue("saveConfig.excludeList", newList);
  };

  useEffect(() => {
    console.log("updateFormValues");
    updateFormValues();
  }, [
    saveFolderWatch,
    saveFullFolderWatch,
    includeListWatch,
    excludeListWatch,
  ]);

  const onSubmit = async (data: TGameForm) => {
    console.log("NEW DATA", data);

    // if (data.saveConfig.saveFolder?.path) {
    //   const res = await window.electron.getGlobby({
    //     path: data.saveConfig.saveFolder.path,
    //     includeList: [],
    //     excludeList: []
    //   });
    //   console.log({ res });
    // }

    // if (!data.exePath || !data.saves) return;

    // try {
    //   const exePath = JSON.parse(data.exePath);
    //   const saves = JSON.parse(data.saves);

    //   const isSuccess = isEditing
    //     ? window.electron.editGame({ game, exePath, saves })
    //     : window.electron.createGame({
    //         gamePath: exePath,
    //         saveFilesOrFolder: saves,
    //       });
    //   if (isSuccess) {
    //     Toaster.add({
    //       intent: "success",
    //       content: isEditing ? "Game edited" : "Game created",
    //     });
    //   } else {
    //     throw new Error("Something went wrong");
    //   }
    // } catch (err) {
    //   console.error(err);
    //   Toaster.add({ intent: "error", content: "Something went wrong" });
    // } finally {
    //   navigate("/");
    // }
  };

  if (!game) return null;

  // console.log({
  //   // saveFolderWatch,
  //   // saveFullFolderWatch,
  //   // includeListWatch,
  //   // excludeListWatch,
  //   // saveConfigSaveFolder,
  //   // checked: folderCheckedNodes,
  //   // expanded: folderExpandedNodes,
  // });

  return (
    <Layout>
      <Header>{isEditing ? game?.name : "Add game"}</Header>

      <h3>You need to setup saves config first</h3>

      <FormBlock onSubmit={handleSubmit(onSubmit)}>
        {/*
        <Description>
          Don't know where save file located?
          <br />
          - search by game name on PCGamingWiki
          <br />- find "Save game data location"
        </Description>
        */}

        {/*
        <FileInput
          control={control}
          name="exePath"
          label=".exe file"
          description={`Path to game ".exe" file`}
          properties={["openFile"]}
          filters={[{ name: "All Files", extensions: ["exe"] }]}
          // onClick={onChooseExe}
        />
        */}

        <select style={{ display: "flex", flexDirection: "row" }}>
          <option>pcGamingWiki</option>
          <option>Simple(only folder)</option>
          <option>Complex</option>
        </select>

        <div>Choose only folder but probably not best</div>

        {/* <div>Choose only folder but probably not best</div> */}

        <FolderOrFilesInput<TGameForm>
          control={control}
          name="saveConfig.saveFolder"
          label="Saves folder"
          description={
            <Description>
              Path to saves folder
              {/* <div>
                Path to game save file. Don't know where save file located?
              </div>
              <div style={{ display: "flex" }}>
                You can find game on&nbsp;
                <PcGamingWikiLink to="https://pcgamingwiki.com">
                  PCGamingWiki.com
                </PcGamingWikiLink>
                ,&nbsp;under "Save game data location" will be path to save file
              </div> */}
            </Description>
          }
          // Note: On Windows and Linux an open dialog can not be both a file selector and a directory selector,
          // so if you set properties to ['openFile', 'openDirectory'] on these platforms, a directory selector will be shown.
          // properties={["openDirectory"]}
          properties={["openDirectory"]}
          // isDisabled={!exePath}
          // onClick={onChooseSavesPath}
        />

        <ToggleInput
          label="Save full folder"
          description="Save full folder"
          {...register("saveConfig.saveFullFolder")}
        />

        {!saveFolderWatch && <div>Choose saves folder first</div>}
        {saveFolderWatch && (
          <TreesContainer>
            <CheckboxTreeStyled>
              <div>All files</div>
              <br />

              {isLoadingFolderContent ? (
                <ActivityIndicator />
              ) : (
                <CheckboxTree
                  nodes={folderContentTree}
                  icons={icons}
                  checked={folderCheckedNodes}
                  expanded={folderExpandedNodes}
                  checkModel="all"
                  // noCascade={false}
                  expandOnClick={true}
                  noCascade={true}
                  showExpandAll={true}
                  onClick={() => {}}
                  onCheck={setFolderCheckedNodes}
                  onExpand={setFolderExpandedNodes}
                />
              )}
            </CheckboxTreeStyled>

            <CheckboxTreeStyled>
              <div>Result - files that will be saved</div>
              <br />

              {isLoadingResultContent ? (
                <ActivityIndicator />
              ) : (
                <CheckboxTree
                  nodes={resultContentTree}
                  icons={icons}
                  // checked={resultCheckedNodes}
                  expanded={resultExpandedNodes}
                  disabled={true}
                  showExpandAll={true}
                  // onCheck={setResultCheckedNodes}
                  onExpand={setResultExpandedNodes}
                />
              )}
            </CheckboxTreeStyled>
          </TreesContainer>
        )}

        <IncludeExcludeActions
          checkedNodes={folderCheckedNodes}
          saveFullFolder={saveFullFolderWatch}
          onClickInclude={onClickInclude}
          onClickExclude={onClickExclude}
        />

        <Lists>
          <ListInput
            type="include"
            saveFullFolder={saveFullFolderWatch}
            list={includeListWatch}
            inputProps={register("saveConfig.includeList")}
            onClickRemove={onClickRemoveInclude}
          />

          <ListInput
            type="exclude"
            saveFullFolder={saveFullFolderWatch}
            list={excludeListWatch}
            inputProps={register("saveConfig.excludeList")}
            onClickRemove={onClickRemoveExclude}
          />
        </Lists>

        <CtaButtons>
          <Button type="submit">Save</Button>
          {/* {isEditing && <Button onClick={onRemove}>Remove game</Button>} */}
        </CtaButtons>
      </FormBlock>

      {/* <button onClick={() => {}}>test</button> */}
    </Layout>
  );
};

export default GameSettingsPage;

const Header = styled.h1`
  margin-bottom: 20px;
`;

const Description = styled.div``;

const PcGamingWikiLink = styled(Link)`
  text-decoration: underline;
`;

const CtaButtons = styled.div`
  display: flex;

  > {
    &:not(:first-child) {
      margin-left: 10px;
    }
  }
`;

const TreesContainer = styled.div`
  display: flex;
  margin: -10px;
`;

const CheckboxTreeStyled = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.25);
  margin: 10px;
  padding: 25px;
  border-radius: 10px;
`;

const Lists = styled.div`
  display: flex;
  margin: -10px;
`;
